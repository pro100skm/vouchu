import {HeroUIProvider, NextThemesProvider} from "@repo/ui";
import "./App.css";


function App() {
//todo: Update code base
  return (
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider>
          <QueryClientProvider client={queryClient}>
            <Provider store={store}>
              <WagmiProvider config={config}>
                <RainbowKitProvider
                    locale="en"
                    showRecentTransactions={true}
                    theme={{
                      lightMode: lightTheme(),
                      darkMode: darkTheme(),
                    }}
                >
                  <Updaters />
                  <Component {...pageProps} />
                </RainbowKitProvider>
              </WagmiProvider>
            </Provider>
          </QueryClientProvider>
        </NextThemesProvider>
      </HeroUIProvider>  );
}

export default App;
