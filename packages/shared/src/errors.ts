// Every error the API sends back has this shape
export interface ApiErrorBody {
  message: string;
  // Field name → messages, when a form didn't pass validation
  errors?: Record<string, string[] | undefined>;
  // Signed in, but the website is locked until the password is entered again
  locked?: boolean;
}
