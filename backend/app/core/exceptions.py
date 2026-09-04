class AppError(Exception):
    """Base class for application-level errors."""


class InvalidCredentialsError(AppError):
    """Raised when the email/password combination is invalid."""


class UserAlreadyExistsError(AppError):
    """Raised when trying to register with an email that is already in use."""


class UserNotFoundError(AppError):
    """Raised when a user cannot be found."""


class OTPNotFoundError(AppError):
    """Raised when no OTP exists for the email (never requested or expired)."""


class InvalidOTPError(AppError):
    """Raised when the submitted OTP does not match (attempts still remain)."""


class OTPAttemptsExceededError(AppError):
    """Raised when the user exhausts the maximum number of OTP attempts."""


class InvalidResetTokenError(AppError):
    """Raised when the password reset token is invalid, expired or already used."""