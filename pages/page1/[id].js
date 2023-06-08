import { useRouter } from "next/router";

export default function Page1() {
  const router = useRouter();
  const { id } = router.query;

  return <div>NextJS Router page 1 id: {id}</div>;
}
