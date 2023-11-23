import type { StreamKinds } from './types';
/**
 * Generates a random SSRC (Synchronization Source) number.
 *
 * @remarks
 * This function generates a random 32-bit integer that can be used as an SSRC number.
 *
 * @returns A random SSRC number.
 */
export declare function randomSSRC(): number;
/**
 * Generates a random string of the specified size.
 * @param size The size of the string to generate.
 * @returns A random string of the specified size.
 */
export declare function randomString(size: number): string;
/**
 * Delays the execution of the function that calls it for a specified number of milliseconds.
 * @param ms - The number of milliseconds to delay the execution.
 * @returns A promise that resolves after the specified delay.
 */
export declare function delay(ms: number): Promise<unknown>;
export type Constructor<T = {}> = new (...args: unknown[]) => T;
export declare function applyMixin(target: Constructor, mixin: Constructor, includeConstructor?: boolean): void;
export declare function getTrack(stream: MediaStream | undefined | null, kind: StreamKinds): MediaStreamTrack | undefined;
//# sourceMappingURL=shared.d.ts.map