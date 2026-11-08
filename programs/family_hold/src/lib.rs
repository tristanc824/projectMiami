//! A locked family transfer.
//!
//! Nest's sender-controlled mode uses sender == approver. Normal release still waits
//! for release_after. Instruction 3 is a separate, explicit early override, allowed
//! only for these self-approved holds. Both paths require a fresh sender signature
//! and the release PIN. Cancellation remains available without the PIN.
//! The older separate-approver mode is retained; it cannot use instruction 3.
//!
//! Deposit moves USDC into a vault and stores a hash of a 6-digit PIN.
//! Refund sends it back and only the sender may call it. The sender does not
//! need the PIN. Release sends it to the recipient and requires both the
//! approver's signature and that PIN.
//!
//! The PIN is not a secret on its own: its hash sits in public account data
//! and a 6-digit space is searched in well under a second. The approver's
//! signature is what stops a stranger, or the recipient alone, from releasing.
//!
//! Safe Hold: a deposit may carry a cooling-off delay and a 32-byte hash of
//! the AI review that flagged it. A flagged hold cannot be released before
//! its release time, and release then needs the sender to sign again as well
//! as the approver: a double confirmation after the pressure of the moment
//! has passed. The sender can still refund at any time.
//!
//! Fail closed: a client on its own can only open a Safe Hold of at least 24
//! hours with a non-zero review hash. Anything shorter, including an ordinary
//! hold with no cooling-off, needs the policy authority (the review server) to
//! co-sign the deposit. Skipping the review therefore gets you the slow path,
//! never the fast one. Replace POLICY_AUTHORITY with your server's key before
//! you deploy.
//!
//! A Safe Hold release may not use a durable nonce. Without one, a signed
//! transaction expires within about two minutes, so both signatures must be
//! made at release time, after the cooling-off. Nobody can collect them during
//! the pressure of the moment and submit them a day later.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    clock::Clock,
    hash::hash,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::{instructions as tx_instructions, Sysvar},
};
use spl_token::{
    instruction as token_ix,
    state::{Account as TokenAccount, Mint},
};

entrypoint!(process_instruction);

solana_program::declare_id!("5ZucuntpueZMRDBEs31gL3HrUpZ13NZRahu7T9rLWzv6");

/// The review server's key. It co-signs every deposit shorter than MIN_SAFE_HOLD_SECONDS.
/// Its secret lives in hold/keys/policy-authority.json (never committed) and belongs on the server.
const POLICY_AUTHORITY: Pubkey = solana_program::pubkey!("77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb");

const DEPOSIT: u8 = 0;
const REFUND: u8 = 1;
const RELEASE: u8 = 2;
// Explicit sender override for self-approved holds; never the default release path.
const RELEASE_EARLY: u8 = 3;
const STATE_SIZE: usize = 243;
const TAG: usize = 0;
const SENDER: usize = 1;
const APPROVER: usize = 33;
const RECIPIENT: usize = 65;
const MINT: usize = 97;
const VAULT: usize = 129;
const AMOUNT: usize = 161;
const BUMP: usize = 169;
const PIN_HASH: usize = 170;
const RELEASE_AFTER: usize = 202; // i64 unix seconds; 0 = no cooling-off
const REVIEW_HASH: usize = 210; // sha256 of the review that flagged the transfer
const FLAGS: usize = 242;
const FLAG_SAFE_HOLD: u8 = 1;
const MAX_HOLD_SECONDS: u64 = 30 * 24 * 60 * 60;
const MIN_SAFE_HOLD_SECONDS: u64 = 24 * 60 * 60;
const DEPOSIT_DATA_LEN: usize = 80; // amount u64, PIN hash, hold seconds u64, review hash

const BAD_INSTRUCTION: u32 = 0;
const SAME_PERSON: u32 = 1;
const WRONG_SENDER: u32 = 2;
const WRONG_PIN: u32 = 3;
const WRONG_DESTINATION: u32 = 4;
const WRONG_MINT: u32 = 5;
const WRONG_APPROVER: u32 = 6;
const WRONG_OWNER: u32 = 7;
const TOO_EARLY: u32 = 8;
const BAD_HOLD: u32 = 9;
const NEEDS_POLICY_COSIGN: u32 = 10;
const PRESIGNED_RELEASE: u32 = 11;
/// System instruction 4 is AdvanceNonceAccount: the mark of a durable-nonce transaction.
const ADVANCE_NONCE_ACCOUNT: [u8; 4] = [4, 0, 0, 0];

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id != &id() {
        return Err(ProgramError::IncorrectProgramId);
    }
    let (tag, rest) = instruction_data
        .split_first()
        .ok_or(ProgramError::Custom(BAD_INSTRUCTION))?;
    match *tag {
        DEPOSIT => deposit(program_id, accounts, rest),
        REFUND => refund(program_id, accounts),
        RELEASE => release(program_id, accounts, rest, false),
        RELEASE_EARLY => release(program_id, accounts, rest, true),
        _ => Err(ProgramError::Custom(BAD_INSTRUCTION)),
    }
}

fn deposit(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    // Always 80 bytes: amount, PIN hash, hold seconds, review hash. There is no short
    // format, so no deposit can leave out the hold decision.
    if data.len() != DEPOSIT_DATA_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount = u64::from_le_bytes(data[..8].try_into().unwrap());
    let pin_hash: [u8; 32] = data[8..40].try_into().unwrap();
    let hold_seconds = u64::from_le_bytes(data[40..48].try_into().unwrap());
    let review_hash: [u8; 32] = data[48..80].try_into().unwrap();
    if amount == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }
    if hold_seconds > MAX_HOLD_SECONDS || review_hash == [0u8; 32] {
        return Err(ProgramError::Custom(BAD_HOLD));
    }
    let (release_after, flags) = if hold_seconds > 0 {
        let now = Clock::get()?.unix_timestamp;
        let seconds = i64::try_from(hold_seconds).map_err(|_| ProgramError::Custom(BAD_HOLD))?;
        let release_after = now.checked_add(seconds).ok_or(ProgramError::ArithmeticOverflow)?;
        (release_after, FLAG_SAFE_HOLD)
    } else {
        (0, 0)
    };

    let account_info_iter = &mut accounts.iter();
    let fee_payer = next_account_info(account_info_iter)?;
    let sender = next_account_info(account_info_iter)?;
    let approver = next_account_info(account_info_iter)?;
    let recipient = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let sender_token = next_account_info(account_info_iter)?;
    let vault = next_account_info(account_info_iter)?;
    let state = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    // Optional 11th account: the policy authority, required below for anything under 24 hours.
    let policy_authority = next_account_info(account_info_iter).ok();

    require_signer(fee_payer)?;
    require_signer(sender)?;
    if approver.key == recipient.key {
        return Err(ProgramError::Custom(SAME_PERSON));
    }
    if hold_seconds < MIN_SAFE_HOLD_SECONDS {
        // An ordinary hold, or a Safe Hold shorter than 24 hours (a demo), only with the
        // review server's co-signature. Without it, the client gets the full Safe Hold or nothing.
        let cosigned = policy_authority
            .map(|account| account.is_signer && *account.key == POLICY_AUTHORITY)
            .unwrap_or(false);
        if !cosigned {
            return Err(ProgramError::Custom(NEEDS_POLICY_COSIGN));
        }
    }
    if *token_program.key != spl_token::id() || *system_program.key != solana_program::system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    let sender_account = TokenAccount::unpack(&sender_token.data.borrow())?;
    if sender_account.owner != *sender.key {
        return Err(ProgramError::Custom(WRONG_OWNER));
    }
    if sender_account.mint != *mint.key {
        return Err(ProgramError::Custom(WRONG_MINT));
    }
    let decimals = Mint::unpack(&mint.data.borrow())?.decimals;

    let (state_key, state_bump) = Pubkey::find_program_address(
        &[
            b"hold",
            sender.key.as_ref(),
            approver.key.as_ref(),
            recipient.key.as_ref(),
            mint.key.as_ref(),
        ],
        program_id,
    );
    if state.key != &state_key {
        return Err(ProgramError::InvalidSeeds);
    }
    let (vault_key, vault_bump) = Pubkey::find_program_address(&[b"vault", state.key.as_ref()], program_id);
    if vault.key != &vault_key {
        return Err(ProgramError::InvalidSeeds);
    }
    // create_pda refuses an account that is already in use. A bare lamport
    // balance is not "in use": anyone can send lamports to an address, and
    // refusing on that would let a stranger block this hold forever.

    let state_bump_bytes = [state_bump];
    create_pda(
        fee_payer,
        state,
        STATE_SIZE,
        program_id,
        &[
            b"hold",
            sender.key.as_ref(),
            approver.key.as_ref(),
            recipient.key.as_ref(),
            mint.key.as_ref(),
            &state_bump_bytes,
        ],
        system_program,
    )?;
    write_state(
        state,
        sender.key,
        approver.key,
        recipient.key,
        mint.key,
        vault.key,
        amount,
        vault_bump,
        &pin_hash,
        release_after,
        &review_hash,
        flags,
    )?;

    let vault_bump_bytes = [vault_bump];
    create_pda(
        fee_payer,
        vault,
        spl_token::state::Account::LEN,
        &spl_token::id(),
        &[b"vault", state.key.as_ref(), &vault_bump_bytes],
        system_program,
    )?;
    invoke(
        &token_ix::initialize_account3(&spl_token::id(), vault.key, mint.key, vault.key)?,
        &[vault.clone(), mint.clone(), token_program.clone()],
    )?;
    invoke(
        &token_ix::transfer_checked(
            &spl_token::id(),
            sender_token.key,
            mint.key,
            vault.key,
            sender.key,
            &[],
            amount,
            decimals,
        )?,
        &[
            sender_token.clone(),
            mint.clone(),
            vault.clone(),
            sender.clone(),
            token_program.clone(),
        ],
    )
}

fn refund(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let fee_payer = next_account_info(account_info_iter)?;
    let sender = next_account_info(account_info_iter)?;
    let state = next_account_info(account_info_iter)?;
    let vault = next_account_info(account_info_iter)?;
    let sender_token = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    require_signer(fee_payer)?;
    require_signer(sender)?;
    let hold = load_state(program_id, state, vault, token_program)?;
    if hold.sender != *sender.key {
        return Err(ProgramError::Custom(WRONG_SENDER));
    }
    let destination = TokenAccount::unpack(&sender_token.data.borrow())?;
    if destination.owner != hold.sender || destination.mint != hold.mint {
        return Err(ProgramError::Custom(WRONG_DESTINATION));
    }
    if mint.key != &hold.mint {
        return Err(ProgramError::Custom(WRONG_MINT));
    }
    move_and_close(program_id, hold, state, vault, sender_token, mint, sender, token_program)
}

fn release(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8], early_override: bool) -> ProgramResult {
    if data.len() != 6 || !data.iter().all(|byte| byte.is_ascii_digit()) {
        return Err(ProgramError::Custom(WRONG_PIN));
    }
    let account_info_iter = &mut accounts.iter();
    let fee_payer = next_account_info(account_info_iter)?;
    let sender = next_account_info(account_info_iter)?;
    let approver = next_account_info(account_info_iter)?;
    let state = next_account_info(account_info_iter)?;
    let vault = next_account_info(account_info_iter)?;
    let recipient_token = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    // 9th account: the instructions sysvar, required for a Safe Hold release (see below).
    let instructions_sysvar = next_account_info(account_info_iter).ok();

    require_signer(fee_payer)?;
    require_signer(approver)?;
    let hold = load_state(program_id, state, vault, token_program)?;
    if hold.approver != *approver.key {
        return Err(ProgramError::Custom(WRONG_APPROVER));
    }
    if early_override && hold.approver != hold.sender {
        return Err(ProgramError::Custom(WRONG_APPROVER));
    }
    if hold.flags & FLAG_SAFE_HOLD != 0 {
        // Safe Hold: the cooling-off must be over, and the sender confirms again.
        if !early_override && Clock::get()?.unix_timestamp < hold.release_after {
            return Err(ProgramError::Custom(TOO_EARLY));
        }
        require_signer(sender)?;
        // Fresh signatures only: refuse a durable-nonce transaction, which could have been
        // signed during the pressure of the moment and held back until the deadline.
        let sysvar = instructions_sysvar.ok_or(ProgramError::NotEnoughAccountKeys)?;
        if *sysvar.key != tx_instructions::ID {
            return Err(ProgramError::InvalidArgument);
        }
        let first = tx_instructions::load_instruction_at_checked(0, sysvar)?;
        if first.program_id == solana_program::system_program::id()
            && first.data.get(..4) == Some(&ADVANCE_NONCE_ACCOUNT[..])
        {
            return Err(ProgramError::Custom(PRESIGNED_RELEASE));
        }
    }
    if hash(data).to_bytes() != hold.pin_hash {
        return Err(ProgramError::Custom(WRONG_PIN));
    }
    if hold.sender != *sender.key {
        return Err(ProgramError::Custom(WRONG_SENDER));
    }
    let destination = TokenAccount::unpack(&recipient_token.data.borrow())?;
    if destination.owner != hold.recipient || destination.mint != hold.mint {
        return Err(ProgramError::Custom(WRONG_DESTINATION));
    }
    if mint.key != &hold.mint {
        return Err(ProgramError::Custom(WRONG_MINT));
    }
    move_and_close(
        program_id,
        hold,
        state,
        vault,
        recipient_token,
        mint,
        sender,
        token_program,
    )
}

struct Hold {
    sender: Pubkey,
    approver: Pubkey,
    recipient: Pubkey,
    mint: Pubkey,
    amount: u64,
    vault_bump: u8,
    pin_hash: [u8; 32],
    release_after: i64,
    flags: u8,
}

fn load_state(
    program_id: &Pubkey,
    state: &AccountInfo,
    vault: &AccountInfo,
    token_program: &AccountInfo,
) -> Result<Hold, ProgramError> {
    if state.owner != program_id || *token_program.key != spl_token::id() {
        return Err(ProgramError::IncorrectProgramId);
    }
    let data = state.data.borrow();
    if data.len() != STATE_SIZE || data[TAG] != 1 {
        return Err(ProgramError::InvalidAccountData);
    }
    let hold = Hold {
        sender: read_key(&data, SENDER),
        approver: read_key(&data, APPROVER),
        recipient: read_key(&data, RECIPIENT),
        mint: read_key(&data, MINT),
        amount: u64::from_le_bytes(data[AMOUNT..AMOUNT + 8].try_into().unwrap()),
        vault_bump: data[BUMP],
        pin_hash: data[PIN_HASH..PIN_HASH + 32].try_into().unwrap(),
        release_after: i64::from_le_bytes(data[RELEASE_AFTER..RELEASE_AFTER + 8].try_into().unwrap()),
        flags: data[FLAGS],
    };
    let vault_key = read_key(&data, VAULT);
    drop(data);
    if vault.key != &vault_key || vault.owner != &spl_token::id() {
        return Err(ProgramError::InvalidAccountData);
    }
    let (expected_state, _) = Pubkey::find_program_address(
        &[
            b"hold",
            hold.sender.as_ref(),
            hold.approver.as_ref(),
            hold.recipient.as_ref(),
            hold.mint.as_ref(),
        ],
        program_id,
    );
    if state.key != &expected_state {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(hold)
}

fn move_and_close<'a>(
    _program_id: &Pubkey,
    hold: Hold,
    state: &AccountInfo<'a>,
    vault: &AccountInfo<'a>,
    destination: &AccountInfo<'a>,
    mint: &AccountInfo<'a>,
    rent_destination: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> ProgramResult {
    let decimals = Mint::unpack(&mint.data.borrow())?.decimals;
    // Anyone can send tokens to the vault. Moving only hold.amount would leave
    // that dust behind, close_account would refuse a non-zero balance, and the
    // hold could never be refunded or released. Move the whole balance.
    let vault_account = TokenAccount::unpack(&vault.data.borrow())?;
    if vault_account.mint != hold.mint || vault_account.owner != *vault.key {
        return Err(ProgramError::InvalidAccountData);
    }
    if vault_account.amount < hold.amount {
        return Err(ProgramError::InsufficientFunds);
    }
    let bump = [hold.vault_bump];
    let seeds: &[&[u8]] = &[b"vault", state.key.as_ref(), &bump];
    invoke_signed(
        &token_ix::transfer_checked(
            &spl_token::id(),
            vault.key,
            mint.key,
            destination.key,
            vault.key,
            &[],
            vault_account.amount,
            decimals,
        )?,
        &[
            vault.clone(),
            mint.clone(),
            destination.clone(),
            vault.clone(),
            token_program.clone(),
        ],
        &[seeds],
    )?;
    invoke_signed(
        &token_ix::close_account(
            &spl_token::id(),
            vault.key,
            rent_destination.key,
            vault.key,
            &[],
        )?,
        &[
            vault.clone(),
            rent_destination.clone(),
            vault.clone(),
            token_program.clone(),
        ],
        &[seeds],
    )?;
    close_state(state, rent_destination)
}

fn create_pda<'a>(
    payer: &AccountInfo<'a>,
    account: &AccountInfo<'a>,
    space: usize,
    owner: &Pubkey,
    seeds: &[&[u8]],
    system_program: &AccountInfo<'a>,
) -> ProgramResult {
    let required = Rent::get()?.minimum_balance(space);
    let current = account.lamports();
    if current == 0 {
        return invoke_signed(
            &system_instruction::create_account(payer.key, account.key, required, space as u64, owner),
            &[payer.clone(), account.clone(), system_program.clone()],
            &[seeds],
        );
    }
    // Someone sent lamports to this address first. create_account would fail,
    // so top it up to rent-exempt, then allocate and assign it ourselves.
    if account.owner != &solana_program::system_program::id() || !account.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    let top_up = required.saturating_sub(current);
    if top_up > 0 {
        invoke(
            &system_instruction::transfer(payer.key, account.key, top_up),
            &[payer.clone(), account.clone(), system_program.clone()],
        )?;
    }
    invoke_signed(
        &system_instruction::allocate(account.key, space as u64),
        &[account.clone(), system_program.clone()],
        &[seeds],
    )?;
    invoke_signed(
        &system_instruction::assign(account.key, owner),
        &[account.clone(), system_program.clone()],
        &[seeds],
    )
}

fn write_state(
    state: &AccountInfo,
    sender: &Pubkey,
    approver: &Pubkey,
    recipient: &Pubkey,
    mint: &Pubkey,
    vault: &Pubkey,
    amount: u64,
    vault_bump: u8,
    pin_hash: &[u8; 32],
    release_after: i64,
    review_hash: &[u8; 32],
    flags: u8,
) -> ProgramResult {
    let mut data = state.data.borrow_mut();
    if data.len() != STATE_SIZE {
        return Err(ProgramError::InvalidAccountData);
    }
    data.fill(0);
    data[TAG] = 1;
    data[SENDER..SENDER + 32].copy_from_slice(sender.as_ref());
    data[APPROVER..APPROVER + 32].copy_from_slice(approver.as_ref());
    data[RECIPIENT..RECIPIENT + 32].copy_from_slice(recipient.as_ref());
    data[MINT..MINT + 32].copy_from_slice(mint.as_ref());
    data[VAULT..VAULT + 32].copy_from_slice(vault.as_ref());
    data[AMOUNT..AMOUNT + 8].copy_from_slice(&amount.to_le_bytes());
    data[BUMP] = vault_bump;
    data[PIN_HASH..PIN_HASH + 32].copy_from_slice(pin_hash);
    data[RELEASE_AFTER..RELEASE_AFTER + 8].copy_from_slice(&release_after.to_le_bytes());
    data[REVIEW_HASH..REVIEW_HASH + 32].copy_from_slice(review_hash);
    data[FLAGS] = flags;
    Ok(())
}

fn read_key(data: &[u8], at: usize) -> Pubkey {
    Pubkey::new_from_array(data[at..at + 32].try_into().unwrap())
}

fn require_signer(account: &AccountInfo) -> ProgramResult {
    if account.is_signer {
        Ok(())
    } else {
        Err(ProgramError::MissingRequiredSignature)
    }
}

fn close_state(state: &AccountInfo, destination: &AccountInfo) -> ProgramResult {
    let returning = **state.lamports.borrow();
    **destination.lamports.borrow_mut() = destination
        .lamports()
        .checked_add(returning)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    **state.lamports.borrow_mut() = 0;
    state.assign(&solana_program::system_program::id());
    state.realloc(0, false)?;
    Ok(())
}
