declare module "opencc-js" {
  export function Converter(options: {
    from: "cn" | "tw" | "twp" | "hk" | "jp" | "t";
    to: "cn" | "tw" | "twp" | "hk" | "jp" | "t";
  }): (input: string) => string;
}
