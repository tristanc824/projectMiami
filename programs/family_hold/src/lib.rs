//! A locked family transfer.
//!
//! Deposit moves USDC into a vault and stores a hash of a 6-digit PIN.
//! Refund sends it back and only the sender may call it. The sender does not
//! need the PIN. Release sends it to the recipient and requires that PIN.
//! The raw PIN is not stored on the account.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    hash::hash,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token::{
    instruction as token_ix,
    state::{Account as TokenAccount, Mint},
};

entrypoint!(process_instruction);

solana_program::declare_id!("7NKeoXoNEgW11tgZKV18PPdktQyFHtYQ4CxJA2ffyC6g");

const DEPOSIT: u8 = 0;
const REFUND: u8 = 1;
const RELEASE: u8 = 2;
const STATE_SIZE: usize = 202;
const TAG: usize = 0;
const SENDER: usize = 1;
const APPROVER: usize = 33;
const RECIPIENT: usize = 65;
const MINT: usize = 97;
const VAULT: usize = 129;
const AMOUNT: usize = 161;
const BUMP: usize = 169;
const PIN_HASH: usize = 170;

const BAD_INSTRUCTION: u32 = 0;
const SAME_PERSON: u32 = 1;
const WRONG_SENDER: u32 = 2;
const WRONG_PIN: u32 = 3;
const WRONG_DESTINATION: u32 = 4;
const WRONG_MINT: u32 = 5;

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
        RELEASE => release(program_id, accounts, rest),
        _ => Err(ProgramError::Custom(BAD_INSTRUCTION)),
    }
}

fn deposit(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() != 40 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount = u64::from_le_bytes(data[..8].try_into().unwrap());
    let pin_hash: [u8; 32] = data[8..40].try_into().unwrap();
    if amount == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

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

    require_signer(fee_payer)?;
    require_signer(sender)?;
    if sender.key == approver.key {
        return Err(ProgramError::Custom(SAME_PERSON));
    }
    if *token_program.key != spl_token::id() || *system_program.key != solana_program::system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    let sender_account = TokenAccount::unpack(&sender_token.data.borrow())?;
    if sender_account.owner != *sender.key || sender_account.mint != *mint.key {
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
    if state.lamports() > 0 || vault.lamports() > 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

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

fn release(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() != 6 || !data.iter().all(|byte| byte.is_ascii_digit()) {
        return Err(ProgramError::Custom(WRONG_PIN));
    }
    let account_info_iter = &mut accounts.iter();
    let fee_payer = next_account_info(account_info_iter)?;
    let sender = next_account_info(account_info_iter)?;
    let state = next_account_info(account_info_iter)?;
    let vault = next_account_info(account_info_iter)?;
    let recipient_token = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    require_signer(fee_payer)?;
    let hold = load_state(program_id, state, vault, token_program)?;
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
            hold.amount,
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
    let lamports = Rent::get()?.minimum_balance(space);
    invoke_signed(
        &system_instruction::create_account(payer.key, account.key, lamports, space as u64, owner),
        &[payer.clone(), account.clone(), system_program.clone()],
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
