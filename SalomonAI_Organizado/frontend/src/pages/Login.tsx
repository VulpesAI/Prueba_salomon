import type { GetServerSideProps } from "next";

const LoginPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/login",
    permanent: false,
  },
});

export default LoginPage;
