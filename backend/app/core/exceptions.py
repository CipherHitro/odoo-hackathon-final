class AppError(Exception):
    """Base class for application-level errors."""


# =============================================================================
# Auth & User Domain Errors
# =============================================================================

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


class InactiveUserError(AppError):
    """Raised when a user account is inactive."""


class EmailDeliveryError(AppError):
    """Raised when the email service fails to deliver an email."""


# =============================================================================
# Employee Domain Errors
# =============================================================================

class EmployeeNotFoundError(AppError):
    """Raised when the specified employee does not exist."""


class EmployeeProfileNotFoundError(AppError):
    """Raised when no employee profile is linked to the user account."""


# =============================================================================
# Contract Domain Errors
# =============================================================================

class ContractNotFoundError(AppError):
    """Raised when a contract is not found."""


class InvalidDateRangeError(AppError):
    """Raised when an end_date is earlier than start_date."""


class ContractOverlapError(AppError):
    """Raised when a running contract overlaps with another running contract for the same employee."""


class ContractValidationError(AppError):
    """Raised when contract input violates domain rules (e.g. invalid wage, foreign keys, or dates)."""


class ContractInUseError(AppError):
    """Raised when attempting to delete a contract that is referenced by payslips or payroll records."""


# =============================================================================
# Attendance Domain Errors
# =============================================================================

class AlreadyCheckedInError(AppError):
    """Raised when an employee attempts to check in while already checked in."""


class NotCheckedInError(AppError):
    """Raised when an employee attempts to check out without an active check-in."""


class AttendanceRecordNotFoundError(AppError):
    """Raised when an attendance record cannot be found."""


class InvalidTimeRangeError(AppError):
    """Raised when check_out is earlier than check_in."""


# =============================================================================
# Time Off Domain Errors
# =============================================================================

class TimeOffTypeNotFoundError(AppError):
    """Raised when a requested time off type does not exist."""


class TimeOffTypeAlreadyExistsError(AppError):
    """Raised when creating a time off type with a duplicate name."""


class AllocationNotFoundError(AppError):
    """Raised when an allocation request is not found."""


class RequestNotFoundError(AppError):
    """Raised when a time off request is not found."""


class InsufficientBalanceError(AppError):
    """Raised when an employee requests more days than their available balance."""


class InvalidStatusTransitionError(AppError):
    """Raised when an invalid status transition is attempted."""
