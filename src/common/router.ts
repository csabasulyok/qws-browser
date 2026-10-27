import RouteRecognizerModule from 'route-recognizer';

/**
 * route-recognizer is a UMD bundle: under Node.js ESM its default import is the class itself,
 * while its typings declare an ES default export. Re-expose it with correct typing.
 */
const RouteRecognizer = RouteRecognizerModule as unknown as typeof RouteRecognizerModule.default;
type RouteRecognizer = InstanceType<typeof RouteRecognizer>;

export default RouteRecognizer;
