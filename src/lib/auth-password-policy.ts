export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export function passwordLengthError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu không được dài quá ${PASSWORD_MAX_LENGTH} ký tự.`;
  }
  return null;
}
