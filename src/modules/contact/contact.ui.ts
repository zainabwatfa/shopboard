// Handles the demo contact form on the contact page and reports a valid
// submit to main.ts. Nothing is sent or saved: this site is a course demo.
import { getElement } from "../../shared/ui/dom.ts";
import type { ContactHandlers } from "./contact.types.ts";

export function bindContactEvents(handlers: ContactHandlers): void {
  const form = getElement("contact-form", HTMLFormElement);

  // The browser only fires "submit" once every required field is valid
  form.addEventListener("submit", (event) => {
    // Stop the browser from sending the form or reloading the page
    event.preventDefault();
    handlers.onSubmit();
    form.reset();
  });
}
