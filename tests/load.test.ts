import Dimrill from "../src";
import path from "path";
const dimrillGate = new Dimrill();

test("Autoload schemas", async () => {
  await dimrillGate.autoload(path.join(__dirname, "schemas"));
});
