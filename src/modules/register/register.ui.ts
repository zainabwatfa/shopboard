// Handles the demo register form on the home page and reports a valid
// submit to main.ts. Nothing is sent or saved: this site is a course demo.
import { getElement } from "../../shared/ui/dom.ts";
import type { RegisterHandlers } from "./register.types.ts";

export function bindRegisterEvents(handlers: RegisterHandlers): void {
  const form = getElement("register-form", HTMLFormElement);

  // The browser only fires "submit" once every required field is valid
  form.addEventListener("submit", (event) => {
    // Stop the browser from sending the form or reloading the page
    event.preventDefault();
    handlers.onSubmit();
    form.reset();
  });
}
