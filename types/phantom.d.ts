declare global {
  interface PhantomPublicKeyLike {
    toString(): string;
  }

  interface PhantomConnectResponse {
    publicKey: PhantomPublicKeyLike;
  }

  interface PhantomSignMessageResponse {
    signature: Uint8Array;
    publicKey?: PhantomPublicKeyLike;
  }

  interface PhantomProvider {
    isPhantom?: boolean;
    publicKey?: PhantomPublicKeyLike;
    isConnected?: boolean;
    connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<PhantomConnectResponse>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: Uint8Array, display?: "utf8") => Promise<PhantomSignMessageResponse>;
    signAndSendTransaction?: (tx: any) => Promise<{ signature: string }>;
    signTransaction?: (tx: any) => Promise<any>;
  }

  interface Window {
    solana?: PhantomProvider;
  }
}

export {};
