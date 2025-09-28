import type { GetServerSideProps } from "next";

const DashboardPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/dashboard",
    permanent: false,
  },
});

export default DashboardPage;
