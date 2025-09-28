import type { GetServerSideProps } from "next"

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/login",
    permanent: false,
  },
})

export default function LegacyLoginRedirect() {
  return null
}
