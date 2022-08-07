# data-repo

Github: https://github.com/rocketbean/data-repo/releases
npm: https://www.npmjs.com/package/@rocketbean/data-repo

<hr/>

data-repo is a file-based data storage, which dev's can do basic CRUD operation to a model. this lib might be useful for file caching, or tracking processes outside the node process env, e.g. on managing clusters.

**start by creating an instance:**

    import  DataRepo, { Model } from  "@rocketbean/data-repo";
    import path from "path"

    var repo = await  DataRepo.init({
    	storage:  path.join(process.cwd(), "./storage2"),
    	hashfrom:  "chasi",
    	driver:  "file",
    	options: {
    		writeAs:  "readable",
    	},
    });

initialization will require parameters:

> parameters prefixed with "\*" is a default setting.

- storage [*string*] - directory where repo and accommodated files will be saved
- hashfrom [*string*] - this hash string will be used for naming containers and repo file,
  chaging this property after initialization will cause repo to be re-initialized.
- driver [*string*]- a storage driver option. As of this release, "file" is the only available driver.
- options [object] - associated options, to change the behavior of the repo.
  - options[writeAs] [*string*] - option on how the contents will be saved.
  -      *"readable" - contents will be readable as it will be parsed as JSON string
  -      "hash" - the writer will encrypt contents, with a passphrase.
  - options[passphrase] [*string*] - passphrase to use with the encoding
  - options[reset] [*string|bool* ] - passphrase to use with the encoding
  -      *false - the storage will not be refreshed or deleted.
  -      "invoke" - the storage will be reset everytime the repo is invoked.

**creating a Model**

```
let  clusterModel = await  Model.set("cluster",
{
	session: {
		type:  "",
		unique:  true,
	},
	text: {
		type:  "",
	},
	threads: {
		type: [],
		required:  true,
	},
	logs: {
		type: [],
	},
},
{
	max:  3,
	strict:  true,
},
);
```

Model parameters:

- name [*string*]- Model name
- Schema [*object*]- a basic schema:
  - Schema[type][*any*] - DataType for this declaration,
  - Schema[required][*bool*] - marking this propeprty as required.
  - Schema[unique][*bool*] - marking this propeprty as required && unique.
- Options [*object*] - additional options for the model:
  - Options [max] [*number*] - if this option is set, the records will be limited to the declared value.
  - Options [strict] [*bool*] - if enabled, properties that is undeclared in the schema will not be allowed.

**Model CRUD Operations:**

> async Model.create({}) - creating a record

```
let  clust = await  clusterModel.create({
	session:  uuidv4(),
	threads: [],
	logs: {
		log: {
			message:  "initialized",
		},
	},
	text:  "test",
});
```

<hr/>

> async Model.get(< identifier>) - getting a record
>
> - < identifier>[*as string*] - if string is declared, items will be matched with the "\_id" property that is automatically created and is unique. if matched, it will always return as a single object.
>
> - < identifier>[*as object*] - if type of [object] is passed, it will try to match keys and values to the record,
>   it may return as a single object or an array for multiple results.

```
// fetching record using string
await clusterModel.get('4d4b2c18-bc88-4c50-a599-7d0a58931634')

// Or using an object
await clusterModel.get({ text:  "test3" })
```

<hr/>

> async Model.update(< identifier>, < data>) - updating a record

```
// updating using a model, if the identifier
// results to more than 1 record, all results will be updated
await clusterModel.update({ text:  "test" }, { text:  "test3" })

// Or updating using a schema, will only update the specific record
await clust.update({ text:  "test3" })
```

<hr/>

> async Model.delete(< identifier>, < data>) - deleting a record

```
// deleting using a model, if the identifier
// results to more than 1 record, all results will be deleted
await clusterModel.delete({ text:  "test" })

// Or deleting using a schema, will only delete the specific record
await clust.delete({ text:  "test3" })
```
