{
  description = "spotify-data backend, web app to get info on your Spotify profile";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ rust-overlay.overlays.default ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        rust = pkgs.rust-bin.stable.latest.default;
        openssl = pkgs.openssl;
      in
      {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "spotify-data";
          version = "0.1.0";

          src = ./.;
          cargoLock = {
            lockFile = ./Cargo.lock;
          };

          nativeBuildInputs = [
            rust
            pkgs.pkg-config
          ];

          buildInputs = [
            openssl
          ];

          OPENSSL_LIB_DIR = "${openssl.out}/lib";
          OPENSSL_INCLUDE_DIR = "${openssl.dev}/include";
          PKG_CONFIG_PATH = "${openssl.dev}/lib/pkgconfig";
        };

        devShells.default = pkgs.mkShell {
          packages = [
            rust
            pkgs.cargo
            pkgs.rust-analyzer
            pkgs.pkg-config
            openssl
          ];
          OPENSSL_DIR = openssl.dev;
          PKG_CONFIG_PATH = "${openssl.dev}/lib/pkgconfig";
        };
      });
}
