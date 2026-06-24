export type ServerActionResult<T = void> = {
  success: boolean
  error?: string
  message?: string
  data?: T
}
