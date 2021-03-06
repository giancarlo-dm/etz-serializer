import {
    Class, ITransformer, metadataKeys, NewableClass,
    RegisteredTransformerInfo, SerializableField, SerializableFieldMetadata,
    SerializableMetadata, SerializableOptions, TransformerOptions
} from "../common";
import { InstantiationPolicyEnum } from "../enums";
import {
    NoTransformerDefinedException, TransformerAlreadyDefinedException, TypeNotRegisteredException
} from "../exceptions";

/**
 * (static class) Holds information for all registered types marked with {@link #Serializable @Serializable}
 * decorator and all transformers marked with @Transformer. Also provides methods to programmatically
 * retrieve and add types and transformers.
 *
 * @version 1.0.0
 * @author Giancarlo Dalle Mole
 * @since 20/01/2020
 */
export class SerializerRegistry {

    //#region Private Attributes
    /**
     * All the registered types organized by namespaces (starting with "" - global namespace) with
     * serializable metadata.
     */
    private static registeredTypes: Map<string, Class> = SerializerRegistry.initializeTypesRegistry();
    /**
     * All registered transformers.
     */
    private static registeredTransformers: Map<NewableClass, RegisteredTransformerInfo> = SerializerRegistry.initializeTransformersRegistry();
    /**
     * Singletons transformers cache.
     */
    private static transformersCache: Map<NewableClass, ITransformer<any, any, any>> = SerializerRegistry.initializeTransformersCache();
    //#endregion

    //#region Constructor
    /**
     * Private constructor to prevent instantiation of static class.
     */
    private constructor() {
    }
    //#endregion

    //#region Public Static Methods
    /**
     * Gets the list of registered serializable types organized by namespaces.
     * @return A {@link Map} of the registered types organized by namespaces.
     */
    public static getTypes(): Map<string, Class> {
        return new Map(this.registeredTypes);
    }

    /**
     * Registers a type in the registry as a serializable type. Imperative way instead of {@link #Serializable @Serializable}.
     * @param clazz The class to be registered as a serializable type.
     * @param serializableFields List of serializable fields for the class. Only own class fields SHOULD
     *        be informed, inherited fields are automatically inferred.
     * @param options (optional) Options of the serializable type, such as namespace and
     *        custom name.
     */
    public static addType<C>(clazz: Class<C>, serializableFields: Array<SerializableField<C>>,
                             options?: SerializableOptions): void {

        options = options != null ? options : {};

        let superClass: Class = Reflect.getPrototypeOf(clazz) as Class;
        if (superClass === Reflect.getPrototypeOf(Object)) {
            superClass = Object;
        }

        const fieldInfos: Array<SerializableFieldMetadata> = [];

        // The class did not declare any field for serialization
        if (serializableFields != null) {
            for (let serializableField of serializableFields) {

                const fieldInfo: SerializableFieldMetadata = new SerializableFieldMetadata<any>(
                    serializableField.name as string,
                    serializableField.type,
                    serializableField.groups,
                    serializableField.extra
                );

                fieldInfos.push(fieldInfo);
            }
        }

        const metadata: SerializableMetadata = new SerializableMetadata(
            clazz,
            options.namespace != null ? options.namespace : "global",
            options.name !=  null ? options.name : clazz.name,
            options.version = options.version != null ? options.version : 1,
            superClass,
            fieldInfos
        );

        Reflect.defineMetadata(metadataKeys.serializable, metadata, clazz);
        this.registeredTypes.set(`${metadata.namespace}.${metadata.name}`, clazz);
    }

    /**
     * Gets a registered serializable type based on a fully qualified name.
     * @param fqn The fully qualified name
     * @returns The {@link Class} of the given fully qualified name.
     *
     * @throws Error - Type not found.
     */
    public static getType(fqn: string): Class {

        if (this.registeredTypes.has(fqn)) {
            return this.registeredTypes.get(fqn);
        }
        else {
            throw new TypeNotRegisteredException(fqn);
        }
    }

    /**
     * Verify if a given class is registered in the registry as a serializable type.
     * @param clazz The class to check.
     * @return True if the class is serializable, false otherwise.
     *
     * @throws {@link VersionMismatchException} - When the class is registered, but with a different version.
     */
    public static hasType(clazz: Class): boolean {

        if (!Reflect.hasOwnMetadata(metadataKeys.serializable, clazz)) {
            return false;
        }

        const serializableMetadata: SerializableMetadata = Reflect.getOwnMetadata(metadataKeys.serializable, clazz);
        return this.registeredTypes.has(`${serializableMetadata.namespace}.${serializableMetadata.name}`);
    }

    /**
     * Gets the list of registered type transformers.
     * @return A {@link Map} of the registered transformers organized by class.
     */
    public static getTransformers(): Map<Class, RegisteredTransformerInfo> {
        return this.registeredTransformers;
    }

    /**
     * Verify if there is a transformer defined for the given type.
     * @param clazz The type to be checked.
     * @returns True if defined, false otherwise.
     */
    public static hasTransformer(clazz: NewableClass): boolean {
        return this.registeredTransformers.has(clazz);
    }

    /**
     * Retrieves a transformer instance for a given type.
     * @param clazz The type to have the transformer instance retrieved.
     * @returns Transformer instance for the given type.
     *
     * @throws NoTransformerDefinedException - If there is not transformer defined for the given type.
     */
    public static getTransformer<T, S, E>(clazz: NewableClass): ITransformer<T, S, E> {

        if (this.transformersCache.has(clazz)) {
            return this.transformersCache.get(clazz);
        }
        else {

            if (!this.registeredTransformers.has(clazz)) {
                throw new NoTransformerDefinedException(clazz);
            }
            else {

                const transformerInfo: RegisteredTransformerInfo = this.registeredTransformers.get(clazz);
                const transformer: ITransformer<T, S, E> = Reflect.construct(transformerInfo.transformer, []);

                // If a singleton, add to cache
                if (transformerInfo.options.instantiationPolicy === InstantiationPolicyEnum.SINGLETON) {
                    this.transformersCache.set(clazz, transformer);
                }

                return transformer;
            }
        }
    }

    /**
     * Registers a type transformer in the registry. Imperative way of {@link #Transformer @Transformer}.
     * @param transformer The class to be registered as a {@link ITransformer} for the given type.
     * @param clazz The class that the transformer is responsible for performing transformation.
     * @param options (optional)
     */
    public static addTransformer<T = any, S = any, E = void>(transformer: NewableClass<ITransformer<T, S, E>>,
                                                             clazz: NewableClass,
                                                             options?: TransformerOptions): void {
        options = options != null ? options : {};
        options.instantiationPolicy = options.instantiationPolicy != null ? options.instantiationPolicy : InstantiationPolicyEnum.SINGLETON;
        options.override = options.override != null ? options.override : false;

        if (this.registeredTransformers.has(clazz) && !options.override) {
            throw new TransformerAlreadyDefinedException(
                clazz,
                this.registeredTransformers.get(clazz).transformer,
                transformer
            );
        }
        else {
            this.registeredTransformers.set(
                clazz,
                new RegisteredTransformerInfo(transformer, options)
            );
        }

        // We clean the singleton transformers cache for the type, so if the transformer is overridden
        // during program execution, it should return the correct instance of it.
        if (this.transformersCache.has(clazz)) {
            this.transformersCache.delete(clazz);
        }
    }
    //#endregion

    //#region Private Static Methods
    /**
     * Initializes the serializable types registry.
     */
    private static initializeTypesRegistry(): Map<string, Class> {

        if (!Reflect.hasMetadata(metadataKeys.namespaceRegistry, Reflect)) {
            Reflect.defineMetadata(metadataKeys.namespaceRegistry, new Map<string, Class>(), Reflect);
        }

        // We define the registry as a metadata on the Reflect object itself due to some issues, such
        // as types that requires transformers not being correctly registered, when using a static
        // attribute of a class on Angular apps.
        return Reflect.getMetadata(metadataKeys.namespaceRegistry, Reflect);
    }

    /**
     * Initializes the type transformers registry.
     */
    private static initializeTransformersRegistry(): Map<NewableClass, RegisteredTransformerInfo> {

        if (!Reflect.hasMetadata(metadataKeys.transformersRegistry, Reflect)) {
            Reflect.defineMetadata(metadataKeys.transformersRegistry, new Map<NewableClass, RegisteredTransformerInfo>(), Reflect);
        }

        // We define the registry as a metadata on the Reflect object itself due to some issues, such
        // as types that requires transformers not being correctly registered, when using a static
        // attribute of a class on Angular apps.
        return Reflect.getMetadata(metadataKeys.transformersRegistry, Reflect);
    }

    private static initializeTransformersCache(): Map<NewableClass, ITransformer<any, any>> {

        if (!Reflect.hasMetadata(metadataKeys.transformersCache, Reflect)) {
            Reflect.defineMetadata(metadataKeys.transformersCache, new Map<NewableClass, ITransformer<any, any>>(), Reflect);
        }

        // We define the registry as a metadata on the Reflect object itself due to some issues, such
        // as types that requires transformers not being correctly registered, when using a static
        // attribute of a class on Angular apps.
        return Reflect.getMetadata(metadataKeys.transformersCache, Reflect);
    }
    //#endregion
}
