// Small page helpers that more than one module's ui file needs.

// getElementById can return null. This checks the element exists and has the
// expected type, and fails with a clear message if the HTML doesn't match.
export function getElement<T extends HTMLElement>(
  id: string,
  type: new () => T,
): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`#${id} is missing or is not a ${type.name}`);
  }
  return element;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(amount: number): string {
  return money.format(amount);
}

// Product pictures sit next to the product name, so they are decorative (alt="")
// and screen readers don't read the name twice
export function createImage(
  src: string,
  className: string,
  size: number,
): HTMLImageElement {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = "";
  image.width = size;
  image.height = size;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}
