import { bech32 } from "bech32";

const convertbits = (
  data: number[],
  inBits: number,
  outBits: number,
  pad: boolean
) => {
  let value = 0;
  let bits = 0;
  const maxV = (1 << outBits) - 1;
  const result = [];
  for (let i = 0; i < data.length; ++i) {
    value = (value << inBits) | data[i];
    bits += inBits;
    while (bits >= outBits) {
      bits -= outBits;
      result.push((value >> bits) & maxV);
    }
  }
  if (pad) {
    if (bits > 0) {
      result.push((value << (outBits - bits)) & maxV);
    }
  } else {
    if (bits >= inBits) return "Excess padding";
    if ((value << (outBits - bits)) & maxV) return "Non-zero padding";
  }
  return result;
};

const fromWords = (words: number[]) => {
  const res = convertbits(words, 5, 8, false);
  if (Array.isArray(res)) return res;
  throw new Error(res);
};

const hexChar = (val: number) => {
  if (val < 10) return String.fromCharCode(48 + val);
  if (val < 16) return String.fromCharCode(97 + val - 10);
};

const hexEncode = (buf: number[]) => {
  let str = "";
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    str += hexChar(c >> 4);
    str += hexChar(c & 0xf);
  }
  return str;
};

export const bech32encode = (str: string) =>
  hexEncode(fromWords(bech32.decode(str).words));
