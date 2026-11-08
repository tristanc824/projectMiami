"""A shared deadline keeps a provider retry from outliving the app's review request."""
import contextvars
import time

deadline = contextvars.ContextVar('review_deadline', default=None)
def timeout(default: float) -> float:
    end = deadline.get()
    if end is None:
        return default
    remaining = end - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('Review deadline exceeded')
    return min(default, remaining)
