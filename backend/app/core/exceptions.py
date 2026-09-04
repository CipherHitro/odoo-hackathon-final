class AppError(Exception):
    """Base class for application-level errors."""


class InvalidCredentialsError(AppError):
    """Raised when the email/password combination is invalid."""


class UserAlreadyExistsError(AppError):
    """Raised when trying to register with an email that is already in use."""


class UserNotFoundError(AppError):
    """Raised when a user cannot be found."""