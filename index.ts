export type AnyT = (ArrayT | StructT | EnumT | SimpleT);
export type RustType = AnyT & { values: string[] };

type SimpleT = { id: "simple"; name: string };
type ArrayT = { id: "array"; item: RustType; fixed?: number };
type EnumT = { id: "enum"; cases: RustType[] };
type StructT = { id: "struct"; fields: NField[] };

type NField = { name: string; type: RustType };

//* Type Comparison:

export function equalType(one: AnyT, two: AnyT): boolean {
  if (one.id !== two.id) return false;
  switch (one.id) {
    case "simple":
      return equalSimple(one, two as SimpleT);
    case "array":
      return equalArray(one, two as ArrayT);
    case "enum":
      return equalEnum(one, two as EnumT);
    case "struct":
      return equalStruct(one, two as StructT);
  }
}

function equalSimple(one: SimpleT, two: SimpleT): boolean {
  return one.name === two.name;
}

function equalArray(one: ArrayT, two: ArrayT): boolean {
  const same = one.fixed === two.fixed;
  return same && equalType(one.item, two.item);
}

function equalEnum(one: EnumT, two: EnumT): boolean {
  const same = one.cases.length === two.cases.length;
  return same && one.cases.every((type) => {
    return two.cases.some((x) => equalType(x, type));
  });
}

function equalStruct(one: StructT, two: StructT): boolean {
  const ordered = orderFields(one.fields, two.fields);
  if (ordered === null) return false;
  return ordered.every(([a, b]) => equalType(a.type, b.type));
}

//* Type Addition:

export function mergeType(one: RustType, two: RustType): RustType | null {
  const values = [...one.values, ...two.values];
  const merged = mergeValued(one, two);
  return merged && { ...merged, values };
}

function mergeValued(one: AnyT, two: AnyT): AnyT | null {
  if (one.id !== two.id) return null;
  switch (one.id) {
    case "simple":
      return mergeSimple(one, two as SimpleT);
    case "array":
      return mergeArray(one, two as ArrayT);
    case "enum":
      return mergeEnum(one, two as EnumT);
    case "struct":
      return mergeStruct(one, two as StructT);
  }
}

function mergeSimple(one: SimpleT, two: SimpleT): SimpleT | null {
  return one.name === two.name ? one : null;
}

function mergeArray(one: ArrayT, two: ArrayT): ArrayT | null {
  if (one.fixed !== two.fixed) return null;
  const item = mergeType(one.item, two.item);
  return item && { id: "array", item, fixed: one.fixed };
}

function mergeEnum(one: EnumT, two: EnumT): EnumT | null {
  const cases = two.cases.reduce(insertCase, one.cases);
  return { id: "enum", cases };
}

function mergeStruct(one: StructT, two: StructT): StructT | null {
  const ordered = orderFields(one.fields, two.fields);
  if (ordered === null) return null;
  const fields = [];
  for (const [a, b] of ordered) {
    const type = mergeType(a.type, b.type);
    if (type === null) return null;
    fields.push({ name: a.name, type });
  }
  return { id: "struct", fields };
}

// Helper functions:
// pure functions but with mutations allowed inside.

function insertCase(cases: RustType[], type: RustType) {
  const variants = [...cases];
  let i = 0;
  for (const other of variants) {
    const merged = mergeType(other, type);
    if (merged !== null) break;
    i += 1;
  }
  variants[i] = type;
  return variants;
}

function orderFields(first: NField[], second: NField[]) {
  if (first.length !== second.length) return null;
  const table = second.map((x) => x.name);
  const output = [];
  for (const x of first) {
    const found = table.indexOf(x.name);
    if (found === -1) return null;
    output.push([x, second[found]]);
  }
  return output;
}
