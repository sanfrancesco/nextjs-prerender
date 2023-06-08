import { useRouter } from "next/router";

export default function Nested() {
  const router = useRouter();
  const { id } = router.query;

  return <div>Nested. id: {id}</div>;
}
