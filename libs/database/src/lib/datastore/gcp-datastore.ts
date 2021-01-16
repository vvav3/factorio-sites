// import { Datastore } from "@google-cloud/datastore";
// import { encodeBlueprint, hashString, parseBlueprintString } from "@factorio-sites/node-utils";
// import {
//   BlueprintStringData,
//   BlueprintBookData,
//   getBlueprintContentForImageHash,
// } from "@factorio-sites/common-utils";
// import { getBlueprintImageRequestTopic } from "./gcp-pubsub";
// import { saveBlueprintString } from "./gcp-storage";
// import { BlueprintBook, Blueprint, BlueprintPage } from "./types";

// const datastore = new Datastore();
// const BlueprintEntity = "Blueprint";
// const BlueprintBookEntity = "BlueprintBook";
// const BlueprintPageEntity = "BlueprintPage";
// const BlueprintStringEntity = "BlueprintString";
// const blueprintImageRequestTopic = getBlueprintImageRequestTopic();

// class DatastoreExistsError extends Error {
//   constructor(public existingId: string, message: string) {
//     super(message);
//     this.name = this.constructor.name;
//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// /*
//  * BlueprintBook
//  */

// const mapBlueprintBookEntityToObject = (entity: any): BlueprintBook => ({
//   id: entity[datastore.KEY].id,
//   // blueprint_ids: entity.blueprint_ids.map((key: any) => key.id),
//   // blueprint_book_ids: entity.blueprint_book_ids.map((key: any) => key.id),
//   child_tree: entity.child_tree ? entity.child_tree : [],
//   blueprint_hash: entity.blueprint_hash,
//   label: entity.label,
//   description: entity.description,
//   created_at: entity.created_at && entity.created_at.getTime() / 1000,
//   updated_at: entity.updated_at && entity.updated_at.getTime() / 1000,
//   is_modded: entity.is_modded || false,
//   factorioprints_id: entity.factorioprints_id || null,
// });

// export async function getBlueprintBookById(id: string): Promise<BlueprintBook | null> {
//   const result = await datastore.get(datastore.key([BlueprintBookEntity, Number(id)]));
//   return result[0] ? mapBlueprintBookEntityToObject(result[0]) : null;
// }

// export async function getBlueprintBookByHash(hash: string): Promise<BlueprintBook | null> {
//   const query = datastore
//     .createQuery(BlueprintBookEntity)
//     .filter("blueprint_hash", "=", hash)
//     .limit(1);
//   const [result] = await datastore.runQuery(query);
//   return result[0] ? mapBlueprintBookEntityToObject(result[0]) : null;
// }

// export async function createBlueprintBook(
//   blueprintBook: BlueprintBookData,
//   extraInfo: { tags: string[]; created_at: number; updated_at: number; factorioprints_id: string }
// ): Promise<{ insertedId: string; child_tree: BlueprintBook["child_tree"] }> {
//   const string = await encodeBlueprint({ blueprint_book: blueprintBook });
//   const blueprint_hash = hashString(string);

//   const exists = await getBlueprintBookByHash(blueprint_hash);
//   if (exists) {
//     const book = await getBlueprintBookById(exists.id);
//     if (!book) throw Error("this is impossible, just pleasing typescript");
//     return { insertedId: exists.id, child_tree: book.child_tree };
//   }

//   // Write string to google storage
//   await saveBlueprintString(blueprint_hash, string);

//   const blueprint_ids = [];
//   const blueprint_book_ids = [];
//   const child_tree: BlueprintBook["child_tree"] = [];

//   // Create the book's child objects
//   for (let i = 0; i < blueprintBook.blueprints.length; i++) {
//     const blueprint = blueprintBook.blueprints[i];
//     if (blueprint.blueprint) {
//       const result = await createBlueprint(blueprint.blueprint, extraInfo);
//       child_tree.push({
//         type: "blueprint",
//         id: result.insertedId,
//         name: blueprint.blueprint.label,
//       });
//       blueprint_ids.push(result.insertedId);
//     } else if (blueprint.blueprint_book) {
//       const result = await createBlueprintBook(blueprint.blueprint_book, extraInfo);
//       child_tree.push({
//         type: "blueprint_book",
//         id: result.insertedId,
//         name: blueprint.blueprint_book.label,
//         children: result.child_tree,
//       });
//       blueprint_book_ids.push(result.insertedId);
//     }
//   }

//   // Write blueprint details to datastore
//   const [result] = await datastore.insert({
//     key: datastore.key([BlueprintBookEntity]),
//     data: [
//       {
//         name: "blueprint_ids",
//         value: blueprint_ids.map((id) => datastore.key([BlueprintEntity, datastore.int(id)])),
//       },
//       {
//         name: "blueprint_book_ids",
//         value: blueprint_book_ids.map((id) =>
//           datastore.key([BlueprintBookEntity, datastore.int(id)])
//         ),
//       },
//       { name: "child_tree", value: child_tree, excludeFromIndexes: true },
//       { name: "label", value: blueprintBook.label },
//       {
//         name: "description",
//         value: blueprintBook.description || null,
//         excludeFromIndexes: true,
//       },
//       { name: "blueprint_hash", value: blueprint_hash },
//       {
//         name: "created_at",
//         value: extraInfo.created_at ? new Date(extraInfo.created_at * 1000) : null,
//         excludeFromIndexes: true,
//       },
//       {
//         name: "updated_at",
//         value: extraInfo.updated_at ? new Date(extraInfo.updated_at * 1000) : null,
//         excludeFromIndexes: true,
//       },
//       { name: "factorioprints_id", value: extraInfo.factorioprints_id || null },
//     ],
//   });

//   const insertedId = String(result.mutationResults?.[0]?.key?.path?.[0]?.id) as string;
//   if (!insertedId) throw Error("Something went wrong inserting entity");

//   console.log(`Created Blueprint book ${insertedId}`);

//   return { insertedId, child_tree };
// }

// /*
//  * Blueprint
//  */

// const mapBlueprintEntityToObject = (entity: any): Blueprint => ({
//   id: entity[datastore.KEY].id,
//   blueprint_hash: entity.blueprint_hash,
//   image_hash: entity.image_hash,
//   label: entity.label,
//   description: entity.description,
//   tags: entity.tags,
//   created_at: entity.created_at && entity.created_at.getTime() / 1000,
//   updated_at: entity.updated_at && entity.updated_at.getTime() / 1000,
//   factorioprints_id: entity.factorioprints_id || null,
//   game_version: entity.game_version,
// });

// const mapBlueprintObjectToEntity = (object: Omit<Blueprint, "id"> & { id?: string }): any => ({
//   key: datastore.key(object.id ? [BlueprintEntity, datastore.int(object.id)] : [BlueprintEntity]),
//   data: [
//     { name: "label", value: object.label },
//     {
//       name: "description",
//       value: object.description || null,
//       excludeFromIndexes: true,
//     },
//     { name: "blueprint_hash", value: object.blueprint_hash },
//     { name: "image_hash", value: object.image_hash },
//     { name: "tags", value: object.tags || [] },
//     {
//       name: "created_at",
//       value: object.created_at ? new Date(object.created_at * 1000) : new Date(),
//       excludeFromIndexes: true,
//     },
//     {
//       name: "updated_at",
//       value: object.updated_at ? new Date(object.updated_at * 1000) : new Date(),
//       excludeFromIndexes: true,
//     },
//     { name: "game_version", value: object.game_version, excludeFromIndexes: true },
//     { name: "factorioprints_id", value: object.factorioprints_id || null },
//   ],
// });

// export async function getBlueprintById(id: string): Promise<Blueprint | null> {
//   const result = await datastore.get(datastore.key([BlueprintEntity, datastore.int(id)]));
//   return result[0] ? mapBlueprintEntityToObject(result[0]) : null;
// }

// export async function getBlueprintByHash(hash: string): Promise<Blueprint | null> {
//   const query = datastore.createQuery(BlueprintEntity).filter("blueprint_hash", "=", hash).limit(1);
//   const [result] = await datastore.runQuery(query);
//   return result[0] ? mapBlueprintEntityToObject(result[0]) : null;
// }

// export async function getBlueprintByImageHash(hash: string): Promise<Blueprint | null> {
//   const query = datastore.createQuery(BlueprintEntity).filter("image_hash", "=", hash).limit(1);
//   const [result] = await datastore.runQuery(query);
//   return result[0] ? mapBlueprintEntityToObject(result[0]) : null;
// }

// export async function createBlueprint(
//   blueprint: BlueprintStringData,
//   extraInfo: { tags: string[]; created_at: number; updated_at: number; factorioprints_id: string }
// ) {
//   const string = await encodeBlueprint({ blueprint });
//   const blueprint_hash = hashString(string);
//   const image_hash = hashString(getBlueprintContentForImageHash(blueprint));

//   const exists = await getBlueprintByHash(blueprint_hash);
//   if (exists) {
//     return { insertedId: exists.id };
//   }

//   // Write string to google storage
//   await saveBlueprintString(blueprint_hash, string);

//   // Write blueprint details to datastore
//   const [result] = await datastore.insert({
//     key: datastore.key([BlueprintEntity]),
//     data: [
//       { name: "label", value: blueprint.label },
//       {
//         name: "description",
//         value: blueprint.description || null,
//         excludeFromIndexes: true,
//       },
//       { name: "blueprint_hash", value: blueprint_hash },
//       { name: "image_hash", value: image_hash },
//       { name: "tags", value: extraInfo.tags ? extraInfo.tags : [] },
//       {
//         name: "created_at",
//         value: extraInfo.created_at ? new Date(extraInfo.created_at * 1000) : new Date(),
//         excludeFromIndexes: true,
//       },
//       {
//         name: "updated_at",
//         value: extraInfo.updated_at ? new Date(extraInfo.updated_at * 1000) : new Date(),
//         excludeFromIndexes: true,
//       },
//       { name: "game_version", value: blueprint.version, excludeFromIndexes: true },
//       { name: "factorioprints_id", value: extraInfo.factorioprints_id || null },
//     ],
//   });

//   const insertedId = String(result.mutationResults?.[0]?.key?.path?.[0]?.id);
//   if (!insertedId) throw Error("Something went wrong inserting entity");

//   console.log(`Created Blueprint ${insertedId}`);

//   blueprintImageRequestTopic.publishJSON({
//     blueprintId: insertedId,
//   });

//   await datastore.insert({
//     key: datastore.key([BlueprintEntity, datastore.int(insertedId), BlueprintStringEntity]),
//     data: [
//       { name: "blueprint_hash", value: blueprint_hash },
//       { name: "image_hash", value: image_hash },
//       { name: "version", value: 1 },
//       { name: "changes_markdown", value: null },
//       {
//         name: "created_at",
//         value: extraInfo.created_at ? new Date(extraInfo.created_at * 1000) : new Date(),
//         excludeFromIndexes: true,
//       },
//     ],
//   });

//   return { insertedId };
// }

// export async function updateBlueprint(blueprint: Blueprint) {
//   datastore.save(mapBlueprintObjectToEntity(blueprint));
// }

// /*
//  * BlueprintPage
//  */
// const mapBlueprintPageEntityToObject = (entity: any): BlueprintPage => ({
//   id: entity[datastore.KEY].id,
//   blueprint_id: entity.blueprint_id ? entity.blueprint_id.id : null,
//   blueprint_book_id: entity.blueprint_book_id ? entity.blueprint_book_id.id : null,
//   title: entity.title,
//   description_markdown: entity.description_markdown,
//   created_at: entity.created_at && entity.created_at.getTime() / 1000,
//   updated_at: entity.updated_at && entity.updated_at.getTime() / 1000,
//   factorioprints_id: entity.factorioprints_id || null,
// });

// export async function getBlueprintPageById(id: string): Promise<BlueprintPage | null> {
//   const result = await datastore.get(datastore.key([BlueprintPageEntity, datastore.int(id)]));
//   return result[0] ? mapBlueprintPageEntityToObject(result[0]) : null;
// }

// export async function getBlueprintPageByFactorioprintsId(
//   id: string
// ): Promise<BlueprintPage | null> {
//   const query = datastore
//     .createQuery(BlueprintPageEntity)
//     .filter("factorioprints_id", "=", id)
//     .limit(1);
//   const [result] = await datastore.runQuery(query);
//   return result[0] ? mapBlueprintPageEntityToObject(result[0]) : null;
// }

// async function createBlueprintPage(
//   type: "blueprint" | "blueprint_book",
//   targetId: string,
//   extraInfo: {
//     title: string;
//     description_markdown: string;
//     created_at: number;
//     updated_at: number;
//     factorioprints_id?: string;
//   }
// ) {
//   const insertData: any = [
//     { name: "title", value: extraInfo.title },
//     {
//       name: "description_markdown",
//       value: extraInfo.description_markdown,
//       excludeFromIndexes: true,
//     },
//     {
//       name: "created_at",
//       value: extraInfo.created_at ? new Date(extraInfo.created_at * 1000) : new Date(),
//       excludeFromIndexes: true,
//     },
//     {
//       name: "updated_at",
//       value: extraInfo.updated_at ? new Date(extraInfo.updated_at * 1000) : new Date(),
//     },
//     { name: "factorioprints_id", value: extraInfo.factorioprints_id || null },
//   ];

//   if (type === "blueprint") {
//     insertData.push({
//       name: "blueprint_id",
//       value: datastore.key([BlueprintEntity, datastore.int(targetId)]),
//     });
//   } else if (type === "blueprint_book") {
//     insertData.push({
//       name: "blueprint_book_id",
//       value: datastore.key([BlueprintBookEntity, datastore.int(targetId)]),
//     });
//   } else {
//     throw Error("Invalid type given");
//   }

//   await datastore.insert({
//     key: datastore.key([BlueprintPageEntity]),
//     data: insertData,
//   });

//   console.log(`Created Blueprint Page`);
// }

// /*
//  * Other
//  */

// interface BlueprintDataFromFactorioprints {
//   description_markdown: string;
//   title: string;
//   updated_at: number;
//   created_at: number;
//   tags: string[];
//   factorioprints_id: string;
// }
// export async function saveBlueprintFromFactorioprints(
//   factorioprintData: BlueprintDataFromFactorioprints,
//   blueprintString: string
// ) {
//   const parsed = await parseBlueprintString(blueprintString);

//   // not needed for inserting, just printing
//   // const { blueprints, books } = flattenBlueprintData(parsed.data);
//   // console.log(`string has ${books.length} books with ${blueprints.length} blueprints`);

//   const extraInfo = {
//     created_at: factorioprintData.created_at,
//     updated_at: factorioprintData.updated_at,
//     tags: factorioprintData.tags,
//     factorioprints_id: factorioprintData.factorioprints_id,
//   };

//   const extraInfoPage = {
//     title: factorioprintData.title,
//     description_markdown: factorioprintData.description_markdown,
//     created_at: factorioprintData.created_at,
//     updated_at: factorioprintData.updated_at,
//     factorioprints_id: factorioprintData.factorioprints_id,
//   };

//   if (parsed.data.blueprint) {
//     console.log("string has one blueprint...");
//     const { insertedId } = await createBlueprint(parsed.data.blueprint, extraInfo).catch(
//       (error) => {
//         if (error instanceof DatastoreExistsError) {
//           console.log(`Blueprint already exists with id ${error.existingId}`);
//           return { insertedId: error.existingId };
//         } else throw error;
//       }
//     );
//     await createBlueprintPage("blueprint", insertedId, extraInfoPage);
//   } else if (parsed.data.blueprint_book) {
//     console.log("string has a blueprint book...");
//     const { insertedId } = await createBlueprintBook(parsed.data.blueprint_book, extraInfo);
//     await createBlueprintPage("blueprint_book", insertedId, extraInfoPage);
//   }
//   return true;
// }

// export async function getMostRecentBlueprintPages(page = 1): Promise<BlueprintPage[]> {
//   const perPage = 10;
//   const query = datastore
//     .createQuery(BlueprintPageEntity)
//     .limit(perPage)
//     .offset((page - 1) * perPage);
//   const [result] = await datastore.runQuery(query);
//   return result.map(mapBlueprintPageEntityToObject);
// }

// export async function getPaginatedBlueprints(page = 1, perPage = 10): Promise<Blueprint[]> {
//   const query = datastore
//     .createQuery(BlueprintEntity)
//     .limit(perPage)
//     .offset((page - 1) * perPage);
//   const [result] = await datastore.runQuery(query);
//   return result.map(mapBlueprintEntityToObject);
// }