const fs = require("fs");
const path = require("path");
const packageJson = require("../package.json");

const buildDir = "./dist";

function createProductionPackageJson()
{
  // Create a stripped down package.json for production
  const prodPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    exports: packageJson.exports,
    license: packageJson.license,
    keywords: packageJson.keywords,
    repository: packageJson.repository,
    author: packageJson.author,
    dependencies: packageJson.dependencies
  };

  // Write the production package.json
  fs.writeFileSync(
    path.join(buildDir, "package.json"),
    JSON.stringify(prodPackage, null, 2)
  );
}

function createEsmModulePackageJson()
{
  fs.readdir(buildDir, function (err, dirs)
  {
    if (err)
    {
      throw err;
    }
    dirs.forEach(function (dir)
    {
      if (dir === "esm")
      {
        const packageJsonFile = path.join(buildDir, dir, "/package.json");
        if (!fs.existsSync(packageJsonFile))
        {
          fs.writeFile(
            packageJsonFile,
            new Uint8Array(Buffer.from('{"type": "module"}')),
            function (err)
            {
              if (err)
              {
                throw err;
              }
            }
          );
        }
      }
    });
  });
}

// Create production package.json
createProductionPackageJson();

// Create ESM module package.json
createEsmModulePackageJson();
