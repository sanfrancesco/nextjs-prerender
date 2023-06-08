import NextLink from "next/link";
import styles from "../styles/Home.module.css";

import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

// alternatively see https://colinhacks.com/essays/building-a-spa-with-nextjs but I couldn't get
// their approach to work, but this simple ClientSideRendering approach works
function ClientSideRendering({ children }: any) {
  const [csrReady, setCsrReady] = useState(false);
  useEffect(() => {
    setCsrReady(true);
  }, []);

  return csrReady ? children : null;
}

const RootElement = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>React Router pages/index.tsx</h1>

      <ul>
        <li>
          <NextLink href="/page1">NextJS Page1</NextLink>
        </li>
        <li>
          <Link to="/react-router-page-1">React Router Page 1</Link>
        </li>
        <li>
          <Link to="/react-router-page-2">React Router Page 2</Link>
        </li>
      </ul>
    </div>
  );
};

const Home = () => {
  return (
    <ClientSideRendering>
      <BrowserRouter>
        <Routes>
          <Route
            path="/react-router-page-1"
            element={<div>react router page 1</div>}
          ></Route>
          <Route
            path="/react-router-page-2"
            element={<div>react router page 2</div>}
          ></Route>
          <Route path="/" element={<RootElement />}></Route>
        </Routes>
      </BrowserRouter>
    </ClientSideRendering>
  );
};

export default Home;
