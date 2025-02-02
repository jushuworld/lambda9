import { Request, Response } from 'express';

// TODO: Proper TypeScript types for modules
export default (path: { join: Function }, queryString: { parse: Function }) => (
  dir: string,
  useStatic: boolean,
  timeout: number
) => {
  return function(req: Request, res: Response, next: Function) {
    const fn: string = req.path.split('/').filter(name => name)[0];
    const joinModPath = path.join(process.cwd(), dir, fn);
    const handler = require(joinModPath);
    const lambdaReq = {
      path: req.path,
      httpMethod: req.method,
      queryStringParameters: queryString.parse(req.url.split(/\?(.+)/)[1]),
      headers: req.headers,
      body: req.body,
    };
    const callback = createCallback(res);
    const promise = handler.handler(lambdaReq, null, callback);
    Promise.all([promisifyHandler(promise, callback)]) // TODO: Implement promise with timeout
      .then(() => {
        return next();
      })
      .catch(err => {
        throw err;
      });
  };
};

function createCallback(res: Response) {
  return function callback(err: Error | null, lambdaRes: any) {
    if (err) return err; // TODO: Proper error handling
    res.statusCode = lambdaRes.statusCode;
    for (let key in lambdaRes.headers) {
      res.setHeader(key, lambdaRes.headers[key]);
    }
    if (lambdaRes.body) {
      res.write(lambdaRes.body);
    }
  };
}

function promisifyHandler(promise: { then: Function }, callback: Function) {
  if (
    !promise ||
    typeof promise.then !== 'function' ||
    typeof callback !== 'function'
  )
    return;

  return promise
    .then((data: object) => {
      callback(null, data);
    })
    .catch((err: Error | null) => {
      callback(err, null);
    });
}
