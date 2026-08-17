/* Wrong-answer cases for 02/0010-forms-login-register.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0010-forms-login-register.html \
 *        --wrong scripts/cases/0010-forms-login-register.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for trims the password. It is one character
 * different from trimming the username, which IS correct, and it looks like
 * tidiness rather than a bug. The user registers with " hunter2 ", the app
 * stores the hash of "hunter2", and the password they typed stops working the
 * first time anything else sends it untrimmed. Nothing in the app can explain
 * that to them.
 */

export const alternatives = {
  "separate helpers per field": `const USERNAME_OK = /^[a-z0-9_]+$/i;

function usernameError(raw) {
  const name = String(raw ?? "").trim();
  if (!name) return "Username is required";
  if (name.length < 3) return "Username must be at least 3 characters";
  if (name.length > 30) return "Username must be 30 characters or fewer";
  if (!USERNAME_OK.test(name)) return "Letters, numbers and underscores only";
  return null;
}

function passwordError(pw) {
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password must be 128 characters or fewer";
  return null;
}

function validateRegistration(form) {
  const errors = {};
  const u = usernameError(form.username);
  if (u) errors.username = u;

  const password = form.password ?? "";
  const p = passwordError(password);
  if (p) errors.password = p;
  else if (form.confirm !== password) errors.confirm = "Passwords do not match";

  return errors;
}`,

  "a list of rules walked in order": `function validateRegistration(form) {
  const errors = {};
  const name = String(form.username ?? "").trim();
  const password = form.password ?? "";

  const usernameRules = [
    [() => name.length === 0, "Username is required"],
    [() => name.length < 3, "Username must be at least 3 characters"],
    [() => name.length > 30, "Username must be 30 characters or fewer"],
    [() => !/^[a-z0-9_]+$/i.test(name), "Letters, numbers and underscores only"],
  ];
  for (const [failed, message] of usernameRules) {
    if (failed()) { errors.username = message; break; }
  }

  const passwordRules = [
    [() => password.length === 0, "Password is required"],
    [() => password.length < 8, "Password must be at least 8 characters"],
    [() => password.length > 128, "Password must be 128 characters or fewer"],
  ];
  let passwordOk = true;
  for (const [failed, message] of passwordRules) {
    if (failed()) { errors.password = message; passwordOk = false; break; }
  }

  if (passwordOk && form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,

  "destructures with defaults up front": `function validateRegistration({ username = "", password = "", confirm = "" }) {
  const errors = {};
  const name = username.trim();

  if (name === "") errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (/[^a-zA-Z0-9_]/.test(name)) errors.username = "Letters, numbers and underscores only";

  let ok = true;
  if (password === "") { errors.password = "Password is required"; ok = false; }
  else if (password.length < 8) { errors.password = "Password must be at least 8 characters"; ok = false; }
  else if (password.length > 128) { errors.password = "Password must be 128 characters or fewer"; ok = false; }

  if (ok && confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
};

export const mistakes = {
  "trims the password as well as the username": {
    expect: "a password with leading and trailing spaces is ACCEPTED",
    impl: `function validateRegistration(form) {
  const errors = {};
  const name = String(form.username ?? "").trim();
  const password = String(form.password ?? "").trim();   // <-- changes the password

  if (!name) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  let ok = false;
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer";
  else ok = true;

  if (ok && String(form.confirm ?? "").trim() !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },

  "returns on the first problem instead of collecting them": {
    expect: "every failing field is reported at once",
    impl: `function validateRegistration(form) {
  const name = String(form.username ?? "").trim();
  if (!name) return { username: "Username is required" };
  if (name.length < 3) return { username: "Username must be at least 3 characters" };
  if (name.length > 30) return { username: "Username must be 30 characters or fewer" };
  if (!/^[a-z0-9_]+$/i.test(name)) return { username: "Letters, numbers and underscores only" };

  const password = form.password ?? "";
  if (!password) return { password: "Password is required" };
  if (password.length < 8) return { password: "Password must be at least 8 characters" };
  if (password.length > 128) return { password: "Password must be 128 characters or fewer" };

  if (form.confirm !== password) return { confirm: "Passwords do not match" };
  return {};
}`,
  },

  "truncates a long password instead of rejecting it": {
    expect: "a password over 128 characters is reported",
    impl: `function validateRegistration(form) {
  const errors = {};
  const name = String(form.username ?? "").trim();
  const password = String(form.password ?? "").slice(0, 128);   // silently shortened

  if (!name) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  let ok = false;
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else ok = true;

  if (ok && form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },

  "reports a whitespace-only username as too short rather than missing": {
    expect: "a whitespace-only username is 'required', not 'too short'",
    impl: `function validateRegistration(form) {
  const errors = {};
  const raw = String(form.username ?? "");
  const name = raw.trim();

  if (raw.length === 0) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  const password = form.password ?? "";
  let ok = false;
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer";
  else ok = true;

  if (ok && form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },

  "checks confirm even when the password is invalid": {
    expect: "confirm is not checked while the password itself is invalid",
    impl: `function validateRegistration(form) {
  const errors = {};
  const name = String(form.username ?? "").trim();
  const password = form.password ?? "";

  if (!name) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer";

  if (form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },

  "never trims the username, so a pasted space fails the charset rule": {
    expect: "a padded username is accepted after trimming",
    impl: `function validateRegistration(form) {
  const errors = {};
  const name = String(form.username ?? "");
  const password = form.password ?? "";

  if (!name) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  let ok = false;
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer";
  else ok = true;

  if (ok && form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },

  "writes the trimmed username back onto the form": {
    expect: "the form object is never mutated",
    impl: `function validateRegistration(form) {
  const errors = {};
  form.username = String(form.username ?? "").trim();   // mutates the caller's form
  const name = form.username;
  const password = form.password ?? "";

  if (!name) errors.username = "Username is required";
  else if (name.length < 3) errors.username = "Username must be at least 3 characters";
  else if (name.length > 30) errors.username = "Username must be 30 characters or fewer";
  else if (!/^[a-z0-9_]+$/i.test(name)) errors.username = "Letters, numbers and underscores only";

  let ok = false;
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer";
  else ok = true;

  if (ok && form.confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}`,
  },
};
