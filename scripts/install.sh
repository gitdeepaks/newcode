#!/bin/sh
set -eu

REPO="${NEWCODE_GITHUB_REPO:-gitdeepaks/newcode}"
VERSION="${NEWCODE_VERSION:-latest}"
INSTALL_DIR="${NEWCODE_INSTALL_DIR:-$HOME/.newcode}"
BIN_DIR="${NEWCODE_BIN_DIR:-$HOME/.local/bin}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "newcode install error: '$1' is required." >&2
    exit 1
  fi
}

need curl
need tar

if ! command -v bun >/dev/null 2>&1; then
  echo "newcode requires Bun." >&2
  echo "Install Bun first:" >&2
  echo "  curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "$os" in
  darwin) platform="darwin" ;;
  linux) platform="linux" ;;
  *)
    echo "newcode install error: unsupported OS '$os'." >&2
    exit 1
    ;;
esac

case "$arch" in
  arm64|aarch64) cpu="arm64" ;;
  x86_64|amd64) cpu="x64" ;;
  *)
    echo "newcode install error: unsupported CPU '$arch'." >&2
    exit 1
    ;;
esac

artifact="newcode-$platform-$cpu.tar.gz"

if [ "$VERSION" = "latest" ]; then
  url="https://github.com/$REPO/releases/latest/download/$artifact"
else
  url="https://github.com/$REPO/releases/download/$VERSION/$artifact"
fi

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT INT TERM

echo "Downloading $artifact from $REPO..."
curl -fL "$url" -o "$tmp/$artifact"

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR" "$BIN_DIR"
tar -xzf "$tmp/$artifact" -C "$tmp"
cp -R "$tmp/newcode/." "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/bin/newcode"

ln -sfn "$INSTALL_DIR/bin/newcode" "$BIN_DIR/newcode"

echo "newcode installed to $INSTALL_DIR"
echo "Command linked at $BIN_DIR/newcode"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo "Add $BIN_DIR to your PATH to run 'newcode' directly."
    ;;
esac

echo "Run: newcode"
