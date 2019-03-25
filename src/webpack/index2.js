"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const index2_1 = require("@angular-devkit/architect/src/index2");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const architect_1 = require("../plugins/architect");
const utils_1 = require("../utils");
const webpackMerge = require('webpack-merge');
function runWebpack(config, context, options = {}) {
    const createWebpack = options.webpackFactory || (config => rxjs_1.of(webpack(config)));
    const log = options.logging
        || ((stats, config) => context.logger.info(stats.toString(config.stats)));
    config = webpackMerge(config, {
        plugins: [
            new architect_1.ArchitectPlugin(context),
        ],
    });
    return createWebpack(config).pipe(operators_1.switchMap(webpackCompiler => new rxjs_1.Observable(obs => {
        const callback = (err, stats) => {
            if (err) {
                return obs.error(err);
            }
            // Log stats.
            log(stats, config);
            obs.next({
                success: !stats.hasErrors(),
                emittedFiles: utils_1.getEmittedFiles(stats.compilation),
            });
            if (!config.watch) {
                obs.complete();
            }
        };
        try {
            if (config.watch) {
                const watchOptions = config.watchOptions || {};
                const watching = webpackCompiler.watch(watchOptions, callback);
                // Teardown logic. Close the watcher when unsubscribed from.
                return () => watching.close(() => { });
            }
            else {
                webpackCompiler.run(callback);
            }
        }
        catch (err) {
            if (err) {
                context.logger.error(`\nAn error occurred during the build:\n${err && err.stack || err}`);
            }
            throw err;
        }
    })));
}
exports.runWebpack = runWebpack;
exports.default = index2_1.createBuilder((options, context) => {
    const configPath = core_1.resolve(core_1.normalize(context.workspaceRoot), core_1.normalize(options.webpackConfig));
    return rxjs_1.from(Promise.resolve().then(() => require(core_1.getSystemPath(configPath)))).pipe(operators_1.switchMap((config) => runWebpack(config, context)));
});
