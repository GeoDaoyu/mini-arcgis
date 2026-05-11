export class Font {
  size: number;
  family: string;
  weight: string;
  style: string;
  decoration: string;

  constructor(
    size: number = 12,
    family: string = "sans-serif",
    weight: string = "normal",
    style: string = "normal",
    decoration: string = "none",
  ) {
    this.size = size;
    this.family = family;
    this.weight = weight;
    this.style = style;
    this.decoration = decoration;
  }

  toString(): string {
    return `${this.style} ${this.weight} ${this.size}px ${this.family}`;
  }
}
