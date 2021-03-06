set -e
trap "echo Failed to fetch binary dependencies." EXIT

if [ -z "$DATA_DIR" ]; then
    echo "Please set DATA_DIR to a writeable directory."
    exit 1
fi

cd `dirname $0`

# Duplicated from scripts/admin/launch-meteor, except that we hardcode the path
# to sysctl. (When satellite spawns ultraworld, ultraworld doesn't have a PATH
# and so can't find sysctl itself.)
UNAME=$(uname)
if [ "$UNAME" != "Linux" -a "$UNAME" != "Darwin" ] ; then
    echo "Sorry, this OS is not supported yet." 1>&2
    exit 1
fi

# If you change this, also change host() in tools/archinfo.js
if [ "$UNAME" = "Darwin" ] ; then
    if [ "i386" != "$(uname -p)" -o "1" != "$(/usr/sbin/sysctl -n hw.cpu64bit_capable 2>/dev/null || echo 0)" ] ; then
        # Can't just test uname -m = x86_64, because Snow Leopard can
        # return other values.
        echo "Only 64-bit Intel processors are supported at this time." 1>&2
        exit 1
    fi
    ARCH="x86_64"
elif [ "$UNAME" = "Linux" ] ; then
    ARCH="$(uname -m)"
    if [ "$ARCH" != "i686" -a "$ARCH" != "x86_64" ] ; then
        echo "Unsupported architecture: $ARCH" 1>&2
        echo "Meteor only supports i686 and x86_64 for now." 1>&2
        exit 1
    fi
fi
PLATFORM="${UNAME}_${ARCH}"


# XXX don't hardcode linux :)
TARBALL="dev_bundle_${PLATFORM}_0.3.38.tar.gz"
BUNDLE_TMPDIR="$DATA_DIR/dependencies.fetch"

rm -rf "$BUNDLE_TMPDIR"
mkdir "$BUNDLE_TMPDIR"

# Cache dev bundles in /tmp.
# XXX something more secure is needed in production
CACHED_TARBALL="/tmp/$TARBALL"
if [ ! -r "$CACHED_TARBALL" ]; then
    # Duplicated from 'meteor' script in root of repository
  TEMP_TARBALL="${CACHED_TARBALL}.tmp.${RANDOM}"
  curl -s "https://d3sqy0vbqsdhku.cloudfront.net/$TARBALL" >"$TEMP_TARBALL"
  mv "$TEMP_TARBALL" "$CACHED_TARBALL"
fi
tar -xzf "$CACHED_TARBALL" -C "$BUNDLE_TMPDIR"

# Delete old dev bundle and rename the new one on top of it.
# XXX probably we can just trust that dependencies from last time are good
DEPS_DIR="$DATA_DIR/dependencies"
rm -rf "$DEPS_DIR"
mv "$BUNDLE_TMPDIR" "$DEPS_DIR"

trap - EXIT
set +e

# If there are global node_modules in the bundle, remove them, since
# they override NODE_PATH. Why are these present? Well, 'meteor
# bundle' historically embeds them to give you a self-contained
# bundle. But that never worked very well, because you'd get the
# version for the arch you built on, and you'd have to manually
# rebuild the binary modules (node-fibers) on the target system. It is
# not ideal to have the bundle modify itself (much better for it to be
# immutable) but it'll do for now.
rm -rf node_modules 2>/dev/null || true

export NODE_PATH="$DEPS_DIR/lib/node_modules"
exec "$DEPS_DIR/bin/node" boot.js program.json "$@"
