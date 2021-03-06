/**
 * Options of a serializable type.
 *
 * @version 1.0.0
 * @author Giancarlo Dalle Mole
 * @since 20/01/2020
 */
export type SerializableOptions = {
    /**
     * (optional) Name of the type. MAY be used to define a custom name.
     * @default: constructor.name (class name).
     */
    name?: string;
    /**
     * (optional) Namespace of the type. MAY be used to group related types.
     * @default: "global" (global namespace).
     */
    namespace?: string;
    /**
     * (optional) Define the current version of the type (integer). MAY be used as a version control
     * to prevent bugs of incompatible versions (i.e. client version != server version).
     * @default: 1
     */
    version?: number;
}
