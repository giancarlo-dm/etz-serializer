# Enterprize Serializer
Custom classes and native TypeScript/JavaScript classes serialization and deserialization with metadata into JSON compliant standard.

# :warning: IN PROGRESSS, DO NOT USE YET! :warning:

# Features
 
- Serialization of primitives and wrappers;
- Serialization of JavaScript built-ins types: Array, Date, Map and Set;
- Serialization of classes marked for serialization using a default serialization strategy;
- Serialization of objects metadata defined with Reflect library;
- Serialization of cyclic references;
- Custom serialization/deserialization transformers, allowing flexibility and default transformers override;
- Object serialization/deserialization customization per serializable class;   
- Open/Closed principle allowing programmer to override basically everything;
- Minimal or no extra metadata on the output JSON object (configurable globally or per operation);
- Serialization groups;
- Custom types transformers, allowing almost anything to be serialized;
- Namespaces and custom names;
- IoC Container aware;
- Minification friendly.\*

\*Minification friendly requires special treatment. More on this on section [**Usage: Minification**](#minification).

## Unsupported features

The following features are not supported, but may be added in the future. If you requires any of the following *unsupported features*, please ask and propose a solution. :wink:

- Generics - Since TypeScript uses the concept of [Type Erasure](https://en.wikipedia.org/wiki/Type_erasure), its very hard to come up with some architecture and API that does not involve too much manual definitions or JSON pollution;
- Multiple Types (e.g. ``Number``|``MyClass``) - Despite it being relatively easy to implement, it is not a core feature since most of the serializable types have a well defined structure and multiple types normally is actived through inheritance, which is supported.

# Requirements

- ES2018+ JavaScript VM (e.g.: NodeJS 12.x LTS+, Chrome 78+)

## Development

- NodeJS 12.x LTS
- TypeScript 3.7.5 

# Usage

See [serializer.spec.ts](src/services/serializer.spec.ts) to see usage while this sections is not written yet :thumbsup:

# Architecture 

This section describes the internal rules and design decisions used in this library.

> Notice: The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).  

## Commandments

* MUST be friendly to IoC containers, such as [Inversify](https://github.com/inversify/InversifyJS);
* MUST only perform serialization/deserialization and type checking. JSON schema validation are other topic and have specific libraries for that (eg.: [AJV](https://github.com/epoberezkin/ajv));
* SHOULD respect JSON standards, unless explicitly said otherwise; 
* SHOULD have minimal performance impact on applications.

## General JSON Serializations

* ``Date`` objects are serialized as ISO strings. (JavaScript ``JSON`` default);
* ``NaN`` values are serialized as ``"NaN"`` string. (JavaScript ``JSON`` uses ``null``);
* ``-Infinity``/``Infinity`` are serialized as ``"-Infinity"`` and ``"Infinity"`` strings. (JavaScript ``JSON`` uses ``null``);
* ``Map`` objects are serialized as tuples <K,V> (eg.: ``[[1, "A"], [2, "B"], [3, {prop: "bar"}]]``). (JavaScript ``JSON`` does not serialize ``Map`` objects, resulting in empty objects - ``{}``);
* ``Set`` objects are serialized as arrays ``[key, value]`` (e.g.: ``[[1, "A"], [2, "B"], [3, {prop: "bar"}]]``). (JavaScript ``JSON`` does not serialize ``Set`` objects, resulting in empty objects - ``{}``);

## Other Rules

- All types/classes not decorated with [``@Serializable``](#serializable) MUST use a [``@Transformer``](#transformert--any-s--any-e--void) to perform serialization;
- Global and per operation behavior configuration;
- To enforce wrappers, you MUST use the extra options of each built-in transformer;
- Possibility to serialize without creating any metadata;
- Possibility to deserialize without metadata. Requires the ``expectedType`` argument on the [``Serializer#deserialize``](#-public-fromjsont-extends-objectjson-jsont-clazz-classt-options-deserializationoptions-t) or [``Serializer#fromJson``](#-public-fromjsont-extends-objectjson-jsont-clazz-classt-options-deserializationoptions-t) method;
- If a wrapper is used (Number, Boolean, String), but it was not enforced by [``TypesEnum.WRAPPER``](#typesenum) enum, then value MUST be serialized/deserialized as a primitive;

## Serialization/Deserialization Process

### Serialization

To serialize an object, an TOP -> BOTTOM strategy is used. In other words, this means that the object is first serialized from its top hierarchy (parent class) to the bottom hierarchy (subclass). Example:
```typescript

class A {
    // Serializable fields
}

class B extends A {
    // Serializable fields
}
```

In this example, all the fields on the class ``A`` marked to serialization will be serialized with the default strategy or, if the class implements the [``ISerializable``](#iserializable) interface, the method ``writeJson`` will be called with a [JsonWriter](#jsonwritert-extends-object-extends-abstractjsonprocessort) service allowing the programmer to customize the process. After ``A`` has its fields serialized, the [``Serializer``](#serializer) will move down the hierarchy, serializing ``B`` with the same strategy as ``A``.

Note: inside ``writeJson`` method you MUST use ``this`` to reference the object being serialized. Also, if the class inherits other serializable classes, the ``JsonWriter.json`` getter will contain the serialized fields declared on those classes.

### Deserialization

To deserialize an object, an TOP -> BOTTOM strategy is also used. In other words, this means that the object is first deserialized from its top hierarchy (parent class) to the bottom hierarchy (subclass). Example:
```typescript

class A {
    // Serializable fields
}

class B extends A {
    // Serializable fields
}
```

In this example, a ``B`` instance will be created first, but the deserialization of the fields will begin from the ``A`` class with the default strategy or, if the class implements the [``ISerializable``](#iserializable) interface, the method ``readJson`` will be called with a [JsonReader](#jsonreadert-extends-object-extends-abstractjsonprocessort) service allowing the programmer to customize the process. After ``A`` has its fields deserialized, the [``Serializer``](#serializer) will move down the hierarchy, deserializing ``B`` fields with the same strategy as ``A``.

Note: inside ``readJson`` method you MUST use ``this`` to reference the object being deserialized. Also, if the class inherits other serializable classes, all the classes up on the hierarchy will be already deserialized and their fields MAY be safely used.

# API

## Interfaces

### ``ISerializable``

Describes method signatures to customize an object serialization/deserialization process for classes marked with [``@Serializable``](#serializable) decorator. When a class implements this interface and the default [``Serializer``](#serializer) is used, the methods ``writeJson`` and ``readJson``  will be called during serialization and deserialization with the object resulted from the default strategy in [``Serializer#writeJson``](#-protected-writejsontinstance-t-jsont) and [``Serializer#readJson``](#-protected-readjsontjson-jsont-t).

You MAY disable the default serialization/deserialization strategy for the class by setting the option ``defaultStrategy`` in ``@Serializable`` to ``false``.

|Methods Summary|Description|
|---|---|
|[``public readJson<T>(defaultInstance: T, json: Json<T>): T``](#-public-readjsontdefault-t-json-jsont-t)|Customize the deserialization operation. |
|[``public writeJson<T>(defaultJson: Json<T>, instance: T): Json<T>``](#-public-writejsontdefault-jsont-instance-t-jsont)|Customize the serialization operation.|

#### # ``public readJson<T>(default: T, json: Json<T>): T``

This method is responsible for customizing the deserialization of the object, restoring it to the original state with the correct prototype. You MAY use this methods in two different ways: changing de ``default`` or creating a brand new object from ``json``. In all cases you must return the restored object (``T``).

Generic Types:

- ``T``: ***(optional)*** The restored object type. MUST be the class itself or not set (inferred).

|Parameters|Type|Description|
|---|:---:|---|
|``default``|``T``|The deserialized object using the default deserialization strategy. The object is an instance of ``T``.|
|``json``|``Json<T>``|The raw JSON object being deserialized. The object is an instance of ``Object`` with ``Json<T>`` format.|

|Returns|
|:---:|
|The deserialized object as an instance of ``T``.|

#### # ``public writeJson<T>(default: Json<T>, instance: T): Json<T>``

This method is responsible for customizing the serialization of the object, generating a ``Json<T>`` version that can be converted into JSON. You MAY use this methods in two different ways: changing de ``default`` or creating a brand new object from ``instance``. In all cases you must return the serialized object (``Json<T>``).

Generic Types:

- ``T``: ***(optional)*** The type of the object to be serialized. MUST be the class itself or not set (inferred).

|Parameters|Type|Description|
|---|:---:|---|
|``default``|``Json<T>``|The serialized object using the default serialization strategy. The object is an instance of ``Object`` with ``Json<T>`` format.|
|``instance``|``T``|The object instance to be serialized. The object is an instance of ``T``.|

|Returns|
|:---:|
|The serialized object as an instance of ``Object`` in ``Json<T>`` format.|

### ``ITransformer<T = any, S = any, E = voi>``

## Decorators

### ``@Serializable``

Marks a class as a serializable type, registering it on the [``SerializerRegistry``](#serializerregistry) as a serializable type. Only non abstract classes can be marked as serializable.

Signatures:

- ``@Serializable()``
- ``@Serializable(options: SerializableOptions)``

|Arguments|Type|Description|
|---------|----|-----------|
|``options``|``SerializableOptions``|***(optional)*** Configure registry options.|

|``SerializableOptions``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|-----------------------------------------|:---:|-----------|
|``name``|``string``|***(optional)*** Name of the type. MAY be used to define a custom name. **Default:** ``constructor.name`` (class name)|
|``namespace``|``string``|***(optional)*** Namespace of the type. MAY be used to group related types. **Default:** ``""`` (empty string, global namespace)|
|``version``|``number``|***(optional)*** Define the current version of the type (integer). MAY be used as a version control to prevent bugs of incompatible versions (i.e. client version <> server version). **Default:** ``1``|
|``defaultStrategy``|``boolean``|***(optional)*** Flag to enable the default deserialization strategy used by ``Serializer``. **Default:** ``true``|

### ``@Serialize<E = void>``

Marks a field for serialization. When marking custom types (i.e. programmer defined classes) be aware of the TDZ HELL (*temporal dead zone*) with cyclic dependencies (see TypeScript issue [#14971](https://github.com/microsoft/TypeScript/issues/14971)), in which case the programmer MUST set the ``type`` parameter (errors MAY be thrown if not set), otherwise its optional.

Generic Types:
- ``E``: The ``extra`` type in ``SerializeOptions<E>``;

Signatures:

- ``@Serialize<E = void>()``
- ``@Serialize<E = void>()``
- ``@Serialize<E = void>(type: () => Class|Function|TypesEnum|Array<Class|Function|TypesEnum>)``
- ``@Serialize<E = void>(options: SerializeOptions)``
- ``@Serialize<E = void>(type: () => Class|Function|TypesEnum|Array<Class|Function|TypesEnum>, options: SerializeOptions)``

|Arguments|Type|Description|
|---|:---:|---|
|``type``|``Class`` ``Function`` ``TypesEnum`` ``Array<Class Function TypesEnum>``|***(optional)*** The type or a list of types that the field holds. **Note:** When using user defined classes with cyclic dependencies this MUST be set to prevent TDZ errors. **Default:** infered by reflection (``"design:type"``).|
|``options``|``SerializeOptions<E>``|***(optional)*** Defines serialization options, such as groups.|

|``SerializeOptions<E>``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|---|:---:|---|
|``groups``|``Array<string>``|***(optional)*** A list of serialization groups to include the attribute during serialization/deserialization.|
|``extra``|``E``|***(optional)*** Some extra data to be passed to the ``Transformer`` during serialization/deserialization. An example of usage is for ``Array`` on the ``ArrayTransformer`` (``ArrayExtra``).

### ``@Transformer<T = any, S = any, E = void>``

Marks a class a type transformer to be used during serialization/deserialization. The type is registered on the [``SerializerRegistry``](#serializerregistry). This decorator provides a declarative way to define a transformer instead of the direct use of [``SerializerRegistry#addTransformer``](#-public-static-addtransformert--any-s--anyclazz-class-transformer-itransformerstatict-s-void) method. The class MUST implement the [``ITransformer<T, S, E>``](#itransformert--any-s--any-e--voi) interface.

The default behavior is to instantiate only once and cache the object for the rest of the application lifecycle. This can be changed by setting the parameter ``TransformerOptions.instatiationBehavior``.

Generic Types:

- ``T``: The type to be transformed before serialization (input);
- ``S``: The transformed type after serialization (output);
- ``E``: ***(optional)*** Some extra data to be passed to the transformer in a per serializable field configuration. May be set in [``@Serialize``](#serializee--void) or directly in [``SerializerRegistry.addType``](#-public-static-addtypeclazz-class-name-string-namespace-string-version-number-void)

Signatures:

- ``@Transformer<T = any, S = any>(type: Class)``
- ``@Transformer<T = any, S = any>(type: Class, options: TransformerOptions)``

|Arguments|Type|Description|
|---|:---:|---|
|``type``|``Class``|The type to be transformed in a JSON compatible format.|
|``options``|``TransformerOptions``|(optional) Defines transformer options, such as instantiation policy.

|``TransformerOptions``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|---|:---:|---|
|``instantiationPolicy``|``InstantiationPolicyEnum``|***(optional)*** The specific policy of this transformer instantiation. Overrides global policy in ``SerializerConfig``.  **Default:** ``InstantiationPolicyEnum.SINGLETON``.

## Classes

### ``Serializer``

The service that performs serialization and deserialization process. Can be configured globally or per operation to change the serialization and deserialization behaviors, such as including or not ``typeMetadata`` and performing other operations.

Accessors Summary|Type|Description|
|---|---|---|
|``config``|``SerializerConfig``|Gets or sets the global configuration of the serializer service|

|Methods Summary|Description|
|---|---|
|[``public serialize<T extends Object>(instance: T, options?: SerializationOptions): string``](#-public-serializet-extends-objectinstance-tarrayt-options-serializationoptions-string)|Serializes object(s) into a ``JSON`` ``string``.|
|[``public deserialize<T extends Object>(json: string, options?: DeserializationOptions): T``](#-public-deserializet-extends-objectjson-string-options-deserializationoptions-t)|Deserializes a an ``JSON`` ``string`` into ``T``.|
|[``public deserialize<T extends Object>(json: string, clazz: Class<T> options?: DeserializationOptions): T``](#-public-deserializet-extends-objectjson-string-options-deserializationoptions-t)|Deserializes a an ``JSON`` ``string`` into ``T`` by using ``clazz`` as root type or type checking.|
|[``public toJson<T extends Object>(instance: T, options?: SerializationOptions): Json<T>``](#-public-tojsont-extends-objectinstance-t-options-serializationoptions-jsont)|Converts a given instance or instances of a class to its "JSON object" version, including, if configured, the necessary metadata to convert it back to a instance of the class.|
|[``public fromJson<T extends Object>(json: Json<T>, options?: DeserializationOptions): T``](#-public-fromjsont-extends-objectjson-jsont-options-deserializationoptions-t)|Restores a given json object to its original instance of class, if possible. For the restoration process to work for some given classes, some metadata must be set.|
|[``public fromJson<T extends Object>(json: Array<Json<T>>, options?: DeserializationOptions): Array<T>``](#-public-fromjsont-extends-objectjson-jsont-clazz-classt-options-deserializationoptions-t)|Restores a given array of json objects to its original instance of class, if possible. For the restoration process to work for some given classes, some metadata must be set.|
|[``public fromJson<T extends Object>(json: Json<T>, clazz: Class<T>, options?: DeserializationOptions): T``](#-public-fromjsont-extends-objectjson-arrayjsont-options-deserializationoptions-arrayt)|Restores a given json object to its original instance of class, if possible, using a specific class to validate or as the type of the root object. For the restoration process to work for some given classes, some metadata must be set.|
|[``public fromJson<T extends Object>(json: Array<Json<T>>, clazz: Class<T>, options?: DeserializationOptions): Array<T>``](#-public-fromjsont-extends-objectjson-arrayjsont-clazz-classt-options-deserializationoptions-arrayt)|Restores a given array of json objects to its original instance of class, if possible, using a specific class to validate or as the type of the root object. For the restoration process to work for some given classes, some metadata must be set.|
|[``protected readJson<T>(json: Json<T>): T``](#-protected-readjsontjson-jsont-t)|***protected*** Default deserialization strategy for ``@Serializable`` classes. Classes that implements ``ISerializable`` will receive the result of this method and can customize the operation per class. Override this method to customize the default deserialization process.|
|[``protected writeJson<T>(instance: T): Json<T>``](#-protected-writejsontinstance-t-jsont)|***protected*** Default serialization strategy for ``@Serializable`` classes. Classes that implements ``ISerializable`` will receive the result of this method and can customize the operation per class. Override this method to customize the default serialization process.|

|``SerializerConfig``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|---|:---:|---|
|``typeMetadata``|``boolean``|***(optional)*** Flag to include object type metadata. Including object type metadata allows transparent object deserialization (deserialization without ``expectedType``), in which case disables types checking but still allows full deserialization. **Default:** ``true``|
|``objectMetadata``|``boolean``|***(optional)*** Flag to includes object metadata defined with ``Reflect.defineMetadata`` or  ``@Reflect.metadata`` **Default:** ``true``|
|``typeCheck``|``boolean``|***(optional)*** Flag to enable type checking upon deserialization (requires ``expectedType`` to validate root object). If a type is a subtype of the type being checked against, it will pass validation, otherwise it will throw ``TypeMismatchException``. **Default:** ``true``|
|``versionMismatchBehavior``|``BehaviorEnum``|***(optional)*** Configure the behavior of class version check upon deserialization. If configured to ``BehaviorEnum.ERROR``, will throw ``VersionMismatchException``. **Default:** ``BehaviorEnum.ERROR``

|``SerializationOptions``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|---|:---:|---|
|``typeMetadata``|``boolean``|***(optional)*** Overrides global configuration ``SerializerConfig.typeMetadata``|
|``objectMetadata``|``boolean``|***(optional)*** Overrides global configuration ``SerializerConfig.objectMetadata``|
|``groups``|``Array<string>``|***(optional)*** Groups to include in serialization process. By default if no group is passed, all attributes will be serialized. If a group is set, only non grouped attributes and attributes that belongs to any of the specified group will be serialized. You may exclude the ungrouped attributes by setting the flag ``excludeUngrouped``.|
|``excludeUngrouped``|``boolean``|***(optional)*** Flag to exclude ungrouped attributes, keeping only attributes that belongs to any of the defined ``groups``. **Default:** ``false``

|``DeserializationOptions``<br><sub><sup>(Type)</sup></sub>|Type|Description|
|---|:---:|---|
|``typeCheck``|``boolean``|***(optional)*** Overrides global configuration ``SerializerConfig.typeCheck``|
|``groups``|``Array<string>``|***(optional)*** Groups to include in deserialization process. By default if no group is passed, all attributes will be deserialized. If a group is set, only non grouped attributes and attributes that belongs to any of the specified group will be deserialized. You may exclude the ungrouped attributes by setting the flag ``excludeUngrouped``.|
|``excludeUngrouped``|``boolean``|***(optional)*** Flag to exclude ungrouped attributes, keeping only attributes that belongs to any of the defined ``groups``. **Default:** ``false``

#### Methods details

##### # ``public getConfig(): SerializerConfig``

##### # ``public setConfig(config: SerializationConfig): void``

##### # ``public clone<T extends Object>(instance: T): T``

##### # ``public serialize<T extends Object>(instance: T|Array<T>, options?: SerializationOptions): string``

##### # ``public deserialize<T extends Object>(json: string, options?: DeserializationOptions): T``

##### # ``public deserialize<T extends Object>(json: string, clazz: Class<T> options?: DeserializationOptions): T``

##### # ``public toJson<T extends Object>(instance: T, options?: SerializationOptions): Json<T>;``

Converts a given instance of a class to its "JSON object" version, including, if configured, the necessary metadata to convert it back to a instance of the class.

Generic types:
- ``T``: ***(optional)*** The object type (class) to be transformed into ``Json<T>``. **Default:** inferred.


|Parameters|Type|Description|
|---|:---:|---|
|``instance``|``T``|The object to be converted into ``Json<T>``.|
|``options``|``SerializerOptions``|***(optional)*** Configure how the operation should be done. **Default:** Uses the global configuration.|

|Throws|Description|
|:---:|---|
|``ArrayDimensionsOutOfRangeException``||
|``IheritanceNonSerializableException``||
|``NonSerializableException``||
|``TypeMismatchException``||
|``VersionMismatchException``||

|Returns|
|---|
|The instance converted to "JSON object" (plain object)|

##### # ``public toJson<T extends Object>(instances: Array<T>, options?: SerializationOptions): Array<Json<T>>``

Converts a given array of instances of a class to its "json object" version, including, if configured, the necessary metadata to convert it back to a instance of the class.

Generic types:
- ``T``: ***(optional)*** The object type (class) to be transformed into ``Json<T>``. **Default:** inferred.

|Parameters|Type|Description|
|---|:---:|---|
|``instances``|``Array<T>``|The array of objects to be converted into ``Json<T>``.|
|``options``|``SerializerOptions``|***(optional)*** Configure how the operation should be done. **Default:** Uses the global configuration.|

|Throws|Description|
|:---:|---|
|``ArrayDimensionsOutOfRangeException``||
|``IheritanceNonSerializableException``||
|``NonSerializableException``||
|``TypeMismatchException``||
|``VersionMismatchException``||

|Returns|
|---|
|The array converted to "JSON object" (plain object)|

##### # ``public fromJson<T extends Object>(json: Json<T>, options?: DeserializationOptions): T``

##### # ``public fromJson<T extends Object>(json: Array<Json<T>>, options?: DeserializationOptions): Array<T>``

##### # ``public fromJson<T extends Object>(json: Json<T>, clazz: Class<T>, options?: DeserializationOptions): T``

##### # ``public fromJson<T extends Object>(json: Array<Json<T>>, clazz: Class<T>, options?: DeserializationOptions): Array<T>``

##### # ``protected readJson<T>(json: Json<T>): T``

##### # ``protected writeJson<T>(instance: T): Json<T>``

### ``SerializerRegistry``

***static class*** Holds information for all registered types marked with [``@Serializable``](#serializable) decorator and all transformers marked with [``@Transformer``](#transformert--any-s--any). Also provides methods to programmatically retrieve and add types and transformers. 

|Method Summary|Description|
|---|---|
|``public static getTypes(): Map<string, RegisteredTypesMap>``|Gets the list of registered serializable types.|
|``public static addType(clazz: Class, name?: string, namespace?: string, version?: number): void``|Registers a type in the registry as a serializable type. Imperative way instead of [``@Serializable``](#serializable).|
|``public getTransformers(): Map<Class, ITransformer<any, any>>: void``|Gets the list of registered type transformers.|
|``public addTransformer<T = any, S = any>(clazz: Class, transformer: ITransformerStatic<T, S>): void``|Registers a type transformer in the registry. Imperative way of [``@Transformer``](#transformert--any-s--any)|

### Methods details

##### # ``public static getTypes(): Map<string, RegisteredTypesMap>``

##### # ``public static addType(clazz: Class, name?: string, namespace?: string, version?: number): void``

##### # ``public static getTransformers(): Map<Class, ITransformer<any, any>>``

##### # ``public static addTransformer<T = any, S = any>(clazz: Class, transformer: ITransformerStatic<T, S>)``


### ``JsonWriter<T extends Object> extends AbstractJsonProcessor<T>``

### ``JsonReader<T extends Object> extends AbstractJsonProcessor<T>``

### ``ArrayTransformer implements ITransformer<Array<any>, Array<any>``

Default ``Array`` transformer.

### ``BooleanTransformer implements ITransformer<Boolean|boolean, boolean>``

Default ``Boolean`` transformer.

### ``MapTransformer implements ITransformer<Map<any, any>, Array<[any, any]>>``

Default ``Map`` transformer.

### ``NumberTransformer implements ITransformer<Number|number, number>``

Default ``Number`` transformer.

### ``ObjectTransformer implements ITransformer<Object, Json<Object>>``

Default ``Object`` transformer.

### ``SetTransformer implements ITransformer<Set<any>, Array<any>>``

Default ``Set`` transformer.

### ``StringTransformer implements ITransformer<String|string, string>``

Default ``String`` transformer.

## Enums

### ``TypesEnum``

Used to define a type to configure a serializable attribute that cannot be expressed naturally in runtime, such as ``any`` type. 

|Value|Description|
|---|---|
|``ANY``|Accepts any type. Use when you do not want to type check.|

### ``BehaviorEnum``

Used to customize behavior on some operations that MAY have different behaviors under certain circumstances or by programmer design choice.  

|Value|Description|
|---|---|
|``WARNING``|Writes a warning on the console when a given situation happens.|
|``ERROR``|Throws an error when a given situation happens. You MAY want to try-catch theses exceptions.|
|``IGNORE``|Do nothing when a given situation happens.|

### ``InstatiationPolicyEnum``

Used to customize object instantiation policy.

|Value|Description|
|---|---|
|``SINGLETON``|Instantiate only once and then cache.|
|``TRANSIENT``|Gets a new instance every time the object is required.|

## Types

### ``AbstractClass<T extends Object = Object> = Function & { prototype: T }``

Type alias for a abstract class definition. Accepts only abstract classes (non constructable classes,  abstract classes).

Generic types:

- ``T``: (optional) The type (class) being represented. Default: ``Object``

### ``Class<T extends Object = Object>``

Type alias for a class definition.

Generic types:

- ``T``: The type (class) being represented.

### ``ExtraTypes``

Type alias for all the extra data that all the built-in transformers accept.

### ``Json<T extends Object>``

Type alias for a json version of a given class. Only the class attributes are keep, methods are excluded. ``Object`` and ``Array`` methods are kept.

Generic types:

- ``T``: The type (class) of the object this JSON structure represents.

### ``JsonMetadata``

Represents serialization metadata to include in the JSON allowing transparent deserialization or correct inheritance deserialization.

|Attributes Summary|Type|Description|
|---|:---:|---|
|``versions``|``Array<[string, number]>``|***(optional)*** Array of tuples with fully qualified name (i.e. namespace plus names separated by "." - dots) with the class versions used to serialize the object. The order is from TOP to BOTTOM in the inheritance hierarchy (e.g. [``A``, ``B``, ``C``] in a ``C extends B``, ``B extends A`` inheritance chain).|
|``objectMetadata``|``Array<[string, any]>``|***(optional)*** Array of tuples of object metadata to restore.|

### ``NewableClass<T extends Object = Object>``

Type alias for a class definition. Accepts only newable classes (i.e. constructable classes, non abstract classes).
Generic Types

- ``T``: (optional) The type (class) being represented. Default: ``Object``

### ``SerializableField``

Represents the configuration of a serializable field.

Generic Types

- ``C``: ***(optional)*** The class the field belongs to. Default: ``any``
- ``E``: ***(optional)*** Extra data to be passed to transformers. Default ``void``

|Attributes Summary|Type|Description|
|---|:---:|---|
|``name``|``keyof C``|The name of the field.|
|``type``|``() => Class TypesEnum``|The type of the field. Must be set as an arrow function to prevent TDZ errors.|
|``groups``|``Array<string>``| ***(optional)*** List of context groups that this field must be included.|
|``extra``|``E ExtraTypes``|***(optional)*** Extra data to be passed to the transformers.|

### ``SerializableOptions``

Options of a serializable type.

|Attributes Summary|Type|Description|
|---|:---:|---|
|``name``|``string``|***(optional)*** Name of the type. MAY be used to define a custom name. **Default:** ``constructor.name`` (class name).|
|``namespace``|``string``|***(optional)*** Namespace of the type. MAY be used to group related types. **Default:** ``"global"``.|
|``version``|``number``|***(optional)*** Define the current version of the type (integer). MAY be used as a version control to prevent bugs of incompatible versions (i.e. client version != server version). **Default:** ``1``.|

### ``SerializeOptions<E = void>``

Serialization options for a field marked with [``@Serialize``](#serializee--void).

|Attributes Summary|Type|Description|
|---|:---:|---|
|``groups``|``Array<string>``|***(optional)*** A list of serialization groups to include the attribute during serialization/deserialization.|
|``extra``|``E ExtraTypes``|***(optional)*** Some extra data to be passed to the Transformer during serialization/deserialization. An example of usage is for ``Array`` on the [``ArrayTransformer``](#arraytransformer-implements-itransformerarrayany-arrayany) (``ArrayExtra``).|

### ``TransformerOptions``

Options to configure a [``ITransformer``](#itransformert--any-s--any-e--voi).

|Attributes Summary|Type|Description|
|---|:---:|---|
|``instantiationPolicy``|[``InstantiationPolicyEnum``](#instatiationpolicyenum)|***(optional)*** The specific policy of this transformer instantiation. Overrides global policy in SerializerConfig. **Default:** ``InstantiationPolicyEnum.SINGLETON``|
|``override``|``boolean``|***(optional)*** Flag to allow an existing type transformer to be overridden, otherwise an [``TransformerAlreadyDefinedException``](#transformeralreadydefinedexception-extends-exceptiontransformeralreadydefinedexceptiondetails) is thrown when trying to override an existing [``ITransformer``](#itransformert--any-s--any-e--voi) definition for a given type. **Default:** ``false``.|

## Exceptions

### ``NotSerializableException extends Exception<NotSerializableExceptionDetails>``

Inherits: [``Exception``](https://github.com/giancarlo-dm/etz-exceptions#exceptiond--void-extends-error)

### ``TransformerAlreadyDefinedException extends Exception<TransformerAlreadyDefinedExceptionDetails>``

Inherits: [``Exception``](https://github.com/giancarlo-dm/etz-exceptions#exceptiond--void-extends-error)

# Sponsor

Use my packages in your projects? You think they are awesome? So, help me give more time to develop them by becoming a sponsor. :wink:

<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=8KT6SPVB84XLY&source=url"><img src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" alt="PayPal - The safer, easier way to pay online!"></a>
