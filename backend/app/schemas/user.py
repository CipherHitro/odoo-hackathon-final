from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class AuthResponse(BaseModel):
    message: str
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=1)
    new_password: str


class MessageResponse(BaseModel):
    message: str


class VerifyOTPResponse(BaseModel):
    message: str
    reset_token: str