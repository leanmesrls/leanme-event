const key = process.argv[2];
if (!key) {
  process.stderr.write("missing key\n");
  process.exit(1);
}
process.stdout.write(`__CAPTURE_${key}__=${process.env[key] || ""}`);
