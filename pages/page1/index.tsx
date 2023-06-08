import Image from "next/image";
import mypic from "./solana.svg";

export default function Page1() {
  return (
    <div>
      NextJS Router page 1<br />
      <Image
        src={mypic}
        alt="relatively loaded image"
        width="350px"
        height="300px"
      />
      <br />
      <Image
        src="/github.svg"
        alt="image from public dir"
        width="350px"
        height="300px"
      />
    </div>
  );
}
