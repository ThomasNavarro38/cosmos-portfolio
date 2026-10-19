/** A render-harness fixture: the lazy child `host.tsx` loads. */

export default function Leaf({ word }: { readonly word: string }) {
  return <p className="leaf">{word}</p>;
}
