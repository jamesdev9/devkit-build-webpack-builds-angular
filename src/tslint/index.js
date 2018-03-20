"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const glob = require("glob");
const minimatch_1 = require("minimatch");
const path = require("path");
const Observable_1 = require("rxjs/Observable");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const strip_bom_1 = require("../angular-cli-files/utilities/strip-bom");
class TslintBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const root = this.context.workspace.root;
        const systemRoot = core_1.getSystemPath(root);
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const options = builderConfig.options;
        if (!options.tsConfig && options.typeCheck) {
            throw new Error('A "project" must be specified to enable type checking.');
        }
        return new Observable_1.Observable(obs => {
            const projectTslint = require_project_module_1.requireProjectModule(core_1.getSystemPath(projectRoot), 'tslint');
            const tslintConfigPath = options.tslintConfig
                ? path.resolve(systemRoot, options.tslintConfig)
                : null;
            const Linter = projectTslint.Linter;
            let result;
            if (options.tsConfig) {
                const tsConfigs = Array.isArray(options.tsConfig) ? options.tsConfig : [options.tsConfig];
                for (const tsConfig of tsConfigs) {
                    const program = Linter.createProgram(path.resolve(systemRoot, tsConfig));
                    const partial = lint(projectTslint, systemRoot, tslintConfigPath, options, program);
                    if (result == undefined) {
                        result = partial;
                    }
                    else {
                        result.errorCount += partial.errorCount;
                        result.warningCount += partial.warningCount;
                        result.failures = result.failures.concat(partial.failures);
                        if (partial.fixes) {
                            result.fixes = result.fixes ? result.fixes.concat(partial.fixes) : partial.fixes;
                        }
                    }
                }
            }
            else {
                result = lint(projectTslint, systemRoot, tslintConfigPath, options);
            }
            if (result == undefined) {
                throw new Error('Invalid lint configuration. Nothing to lint.');
            }
            if (!options.silent) {
                const Formatter = projectTslint.findFormatter(options.format);
                if (!Formatter) {
                    throw new Error(`Invalid lint format "${options.format}".`);
                }
                const formatter = new Formatter();
                const output = formatter.format(result.failures, result.fixes);
                if (output) {
                    this.context.logger.info(output);
                }
            }
            // Print formatter output directly for non human-readable formats.
            if (['prose', 'verbose', 'stylish'].indexOf(options.format) == -1) {
                options.silent = true;
            }
            if (result.warningCount > 0 && !options.silent) {
                this.context.logger.warn('Lint warnings found in the listed files.');
            }
            if (result.errorCount > 0 && !options.silent) {
                this.context.logger.error('Lint errors found in the listed files.');
            }
            if (result.warningCount === 0 && result.errorCount === 0 && !options.silent) {
                this.context.logger.info('All files pass linting.');
            }
            const success = options.force || result.errorCount === 0;
            obs.next({ success });
            return obs.complete();
        });
    }
}
exports.TslintBuilder = TslintBuilder;
function lint(projectTslint, systemRoot, tslintConfigPath, options, program) {
    const Linter = projectTslint.Linter;
    const Configuration = projectTslint.Configuration;
    const files = getFilesToLint(systemRoot, options, Linter, program);
    const lintOptions = {
        fix: options.fix,
        formatter: options.format,
    };
    const linter = new Linter(lintOptions, program);
    let lastDirectory;
    let configLoad;
    for (const file of files) {
        const contents = getFileContents(file, options, program);
        // Only check for a new tslint config if the path changes.
        const currentDirectory = path.dirname(file);
        if (currentDirectory !== lastDirectory) {
            configLoad = Configuration.findConfiguration(tslintConfigPath, file);
            lastDirectory = currentDirectory;
        }
        if (contents && configLoad) {
            linter.lint(file, contents, configLoad.results);
        }
    }
    return linter.getResult();
}
function getFilesToLint(root, options, linter, program) {
    const ignore = options.exclude;
    if (options.files.length > 0) {
        return options.files
            .map(file => glob.sync(file, { cwd: root, ignore, nodir: true }))
            .reduce((prev, curr) => prev.concat(curr), [])
            .map(file => path.join(root, file));
    }
    if (!program) {
        return [];
    }
    let programFiles = linter.getFileNames(program);
    if (ignore && ignore.length > 0) {
        const ignoreMatchers = ignore.map(pattern => new minimatch_1.Minimatch(pattern, { dot: true }));
        programFiles = programFiles
            .filter(file => !ignoreMatchers.some(matcher => matcher.match(file)));
    }
    return programFiles;
}
function getFileContents(file, options, program) {
    // The linter retrieves the SourceFile TS node directly if a program is used
    if (program) {
        if (program.getSourceFile(file) == undefined) {
            const message = `File '${file}' is not part of the TypeScript project '${options.tsConfig}'.`;
            throw new Error(message);
        }
        // TODO: this return had to be commented out otherwise no file would be linted, figure out why.
        // return undefined;
    }
    // NOTE: The tslint CLI checks for and excludes MPEG transport streams; this does not.
    try {
        return strip_bom_1.stripBom(fs_1.readFileSync(file, 'utf-8'));
    }
    catch (e) {
        throw new Error(`Could not read file '${file}'.`);
    }
}
exports.default = TslintBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3RzbGludC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQVFILCtDQUE4RDtBQUM5RCwyQkFBa0M7QUFDbEMsNkJBQTZCO0FBQzdCLHlDQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0IsZ0RBQTZDO0FBRzdDLGtHQUE2RjtBQUM3Rix3RUFBb0U7QUFlcEU7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQXlEO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxvQkFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFdEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksdUJBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMxQixNQUFNLGFBQWEsR0FBRyw2Q0FBb0IsQ0FDeEMsb0JBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLENBQWtCLENBQUM7WUFDekQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsWUFBWTtnQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9B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eEIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVELHlCQUNFLElBQVksRUFDWixPQUE2QixFQUM3QixPQUFvQjtJQUVwQiw0RUFBNEU7SUFDNUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLE9BQU8sR0FBRyxTQUFTLElBQUksNENBQTRDLE9BQU8sQ0FBQyxRQUFRLElBQUksQ0FBQztZQUM5RixNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCwrRkFBK0Y7UUFDL0Ysb0JBQW9CO0lBQ3RCLENBQUM7SUFFRCxzRkFBc0Y7SUFDdEYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLG9CQUFRLENBQUMsaUJBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLENBQUM7SUFDcEQsQ0FBQztBQUNILENBQUM7QUFFRCxrQkFBZSxhQUFhLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBnZXRTeXN0ZW1QYXRoLCByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IE1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyB0c2xpbnQgZnJvbSAndHNsaW50JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWltcGxpY2l0LWRlcGVuZGVuY2llc1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQgeyBzdHJpcEJvbSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdHJpcC1ib20nO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNsaW50QnVpbGRlck9wdGlvbnMge1xuICB0c2xpbnRDb25maWc/OiBzdHJpbmc7XG4gIHRzQ29uZmlnPzogc3RyaW5nIHwgc3RyaW5nW107XG4gIGZpeDogYm9vbGVhbjtcbiAgdHlwZUNoZWNrOiBib29sZWFuO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgc2lsZW50OiBib29sZWFuO1xuICBmb3JtYXQ6IHN0cmluZztcbiAgZXhjbHVkZTogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFRzbGludEJ1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPFRzbGludEJ1aWxkZXJPcHRpb25zPiB7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248VHNsaW50QnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290O1xuICAgIGNvbnN0IHN5c3RlbVJvb3QgPSBnZXRTeXN0ZW1QYXRoKHJvb3QpO1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gcmVzb2x2ZShyb290LCBidWlsZGVyQ29uZmlnLnJvb3QpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBidWlsZGVyQ29uZmlnLm9wdGlvbnM7XG5cbiAgICBpZiAoIW9wdGlvbnMudHNDb25maWcgJiYgb3B0aW9ucy50eXBlQ2hlY2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQSBcInByb2plY3RcIiBtdXN0IGJlIHNwZWNpZmllZCB0byBlbmFibGUgdHlwZSBjaGVja2luZy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICAgIGNvbnN0IHByb2plY3RUc2xpbnQgPSByZXF1aXJlUHJvamVjdE1vZHVsZShcbiAgICAgICAgZ2V0U3lzdGVtUGF0aChwcm9qZWN0Um9vdCksICd0c2xpbnQnKSBhcyB0eXBlb2YgdHNsaW50O1xuICAgICAgY29uc3QgdHNsaW50Q29uZmlnUGF0aCA9IG9wdGlvbnMudHNsaW50Q29uZmlnXG4gICAgICAgID8gcGF0aC5yZXNvbHZlKHN5c3RlbVJvb3QsIG9wdGlvbnMudHNsaW50Q29uZmlnKVxuICAgICAgICA6IG51bGw7XG4gICAgICBjb25zdCBMaW50ZXIgPSBwcm9qZWN0VHNsaW50LkxpbnRlcjtcblxuICAgICAgbGV0IHJlc3VsdDtcbiAgICAgIGlmIChvcHRpb25zLnRzQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IHRzQ29uZmlncyA9IEFycmF5LmlzQXJyYXkob3B0aW9ucy50c0NvbmZpZykgPyBvcHRpb25zLnRzQ29uZmlnIDogW29wdGlvbnMudHNDb25maWddO1xuXG4gICAgICAgIGZvciAoY29uc3QgdHNDb25maWcgb2YgdHNDb25maWdzKSB7XG4gICAgICAgICAgY29uc3QgcHJvZ3JhbSA9IExpbnRlci5jcmVhdGVQcm9ncmFtKHBhdGgucmVzb2x2ZShzeXN0ZW1Sb290LCB0c0NvbmZpZykpO1xuICAgICAgICAgIGNvbnN0IHBhcnRpYWwgPSBsaW50KHByb2plY3RUc2xpbnQsIHN5c3RlbVJvb3QsIHRzbGludENvbmZpZ1BhdGgsIG9wdGlvbnMsIHByb2dyYW0pO1xuICAgICAgICAgIGlmIChyZXN1bHQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBwYXJ0aWFsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZXJyb3JDb3VudCArPSBwYXJ0aWFsLmVycm9yQ291bnQ7XG4gICAgICAgICAgICByZXN1bHQud2FybmluZ0NvdW50ICs9IHBhcnRpYWwud2FybmluZ0NvdW50O1xuICAgICAgICAgICAgcmVzdWx0LmZhaWx1cmVzID0gcmVzdWx0LmZhaWx1cmVzLmNvbmNhdChwYXJ0aWFsLmZhaWx1cmVzKTtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsLmZpeGVzKSB7XG4gICAgICAgICAgICAgIHJlc3VsdC5maXhlcyA9IHJlc3VsdC5maXhlcyA/IHJlc3VsdC5maXhlcy5jb25jYXQocGFydGlhbC5maXhlcykgOiBwYXJ0aWFsLmZpeGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gbGludChwcm9qZWN0VHNsaW50LCBzeXN0ZW1Sb290LCB0c2xpbnRDb25maWdQYXRoLCBvcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGxpbnQgY29uZmlndXJhdGlvbi4gTm90aGluZyB0byBsaW50LicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIGNvbnN0IEZvcm1hdHRlciA9IHByb2plY3RUc2xpbnQuZmluZEZvcm1hdHRlcihvcHRpb25zLmZvcm1hdCk7XG4gICAgICAgIGlmICghRm9ybWF0dGVyKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGxpbnQgZm9ybWF0IFwiJHtvcHRpb25zLmZvcm1hdH1cIi5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgRm9ybWF0dGVyKCk7XG5cbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gZm9ybWF0dGVyLmZvcm1hdChyZXN1bHQuZmFpbHVyZXMsIHJlc3VsdC5maXhlcyk7XG4gICAgICAgIGlmIChvdXRwdXQpIHtcbiAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8ob3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQcmludCBmb3JtYXR0ZXIgb3V0cHV0IGRpcmVjdGx5IGZvciBub24gaHVtYW4tcmVhZGFibGUgZm9ybWF0cy5cbiAgICAgIGlmIChbJ3Byb3NlJywgJ3ZlcmJvc2UnLCAnc3R5bGlzaCddLmluZGV4T2Yob3B0aW9ucy5mb3JtYXQpID09IC0xKSB7XG4gICAgICAgIG9wdGlvbnMuc2lsZW50ID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC53YXJuaW5nQ291bnQgPiAwICYmICFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oJ0xpbnQgd2FybmluZ3MgZm91bmQgaW4gdGhlIGxpc3RlZCBmaWxlcy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC5lcnJvckNvdW50ID4gMCAmJiAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcignTGludCBlcnJvcnMgZm91bmQgaW4gdGhlIGxpc3RlZCBmaWxlcy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC53YXJuaW5nQ291bnQgPT09IDAgJiYgcmVzdWx0LmVycm9yQ291bnQgPT09IDAgJiYgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbygnQWxsIGZpbGVzIHBhc3MgbGludGluZy4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3VjY2VzcyA9IG9wdGlvbnMuZm9yY2UgfHwgcmVzdWx0LmVycm9yQ291bnQgPT09IDA7XG4gICAgICBvYnMubmV4dCh7IHN1Y2Nlc3MgfSk7XG5cbiAgICAgIHJldHVybiBvYnMuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsaW50KFxuICBwcm9qZWN0VHNsaW50OiB0eXBlb2YgdHNsaW50LFxuICBzeXN0ZW1Sb290OiBzdHJpbmcsXG4gIHRzbGludENvbmZpZ1BhdGg6IHN0cmluZyB8IG51bGwsXG4gIG9wdGlvbnM6IFRzbGludEJ1aWxkZXJPcHRpb25zLFxuICBwcm9ncmFtPzogdHMuUHJvZ3JhbSxcbikge1xuICBjb25zdCBMaW50ZXIgPSBwcm9qZWN0VHNsaW50LkxpbnRlcjtcbiAgY29uc3QgQ29uZmlndXJhdGlvbiA9IHByb2plY3RUc2xpbnQuQ29uZmlndXJhdGlvbjtcblxuICBjb25zdCBmaWxlcyA9IGdldEZpbGVzVG9MaW50KHN5c3RlbVJvb3QsIG9wdGlvbnMsIExpbnRlciwgcHJvZ3JhbSk7XG4gIGNvbnN0IGxpbnRPcHRpb25zID0ge1xuICAgIGZpeDogb3B0aW9ucy5maXgsXG4gICAgZm9ybWF0dGVyOiBvcHRpb25zLmZvcm1hdCxcbiAgfTtcblxuICBjb25zdCBsaW50ZXIgPSBuZXcgTGludGVyKGxpbnRPcHRpb25zLCBwcm9ncmFtKTtcblxuICBsZXQgbGFzdERpcmVjdG9yeTtcbiAgbGV0IGNvbmZpZ0xvYWQ7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gZ2V0RmlsZUNvbnRlbnRzKGZpbGUsIG9wdGlvbnMsIHByb2dyYW0pO1xuXG4gICAgLy8gT25seSBjaGVjayBmb3IgYSBuZXcgdHNsaW50IGNvbmZpZyBpZiB0aGUgcGF0aCBjaGFuZ2VzLlxuICAgIGNvbnN0IGN1cnJlbnREaXJlY3RvcnkgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgaWYgKGN1cnJlbnREaXJlY3RvcnkgIT09IGxhc3REaXJlY3RvcnkpIHtcbiAgICAgIGNvbmZpZ0xvYWQgPSBDb25maWd1cmF0aW9uLmZpbmRDb25maWd1cmF0aW9uKHRzbGludENvbmZpZ1BhdGgsIGZpbGUpO1xuICAgICAgbGFzdERpcmVjdG9yeSA9IGN1cnJlbnREaXJlY3Rvcnk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRlbnRzICYmIGNvbmZpZ0xvYWQpIHtcbiAgICAgIGxpbnRlci5saW50KGZpbGUsIGNvbnRlbnRzLCBjb25maWdMb2FkLnJlc3VsdHMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsaW50ZXIuZ2V0UmVzdWx0KCk7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVzVG9MaW50KFxuICByb290OiBzdHJpbmcsXG4gIG9wdGlvbnM6IFRzbGludEJ1aWxkZXJPcHRpb25zLFxuICBsaW50ZXI6IHR5cGVvZiB0c2xpbnQuTGludGVyLFxuICBwcm9ncmFtPzogdHMuUHJvZ3JhbSxcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgaWdub3JlID0gb3B0aW9ucy5leGNsdWRlO1xuXG4gIGlmIChvcHRpb25zLmZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gb3B0aW9ucy5maWxlc1xuICAgICAgLm1hcChmaWxlID0+IGdsb2Iuc3luYyhmaWxlLCB7IGN3ZDogcm9vdCwgaWdub3JlLCBub2RpcjogdHJ1ZSB9KSlcbiAgICAgIC5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHByZXYuY29uY2F0KGN1cnIpLCBbXSlcbiAgICAgIC5tYXAoZmlsZSA9PiBwYXRoLmpvaW4ocm9vdCwgZmlsZSkpO1xuICB9XG5cbiAgaWYgKCFwcm9ncmFtKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgbGV0IHByb2dyYW1GaWxlcyA9IGxpbnRlci5nZXRGaWxlTmFtZXMocHJvZ3JhbSk7XG5cbiAgaWYgKGlnbm9yZSAmJiBpZ25vcmUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGlnbm9yZU1hdGNoZXJzID0gaWdub3JlLm1hcChwYXR0ZXJuID0+IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgeyBkb3Q6IHRydWUgfSkpO1xuXG4gICAgcHJvZ3JhbUZpbGVzID0gcHJvZ3JhbUZpbGVzXG4gICAgICAuZmlsdGVyKGZpbGUgPT4gIWlnbm9yZU1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyLm1hdGNoKGZpbGUpKSk7XG4gIH1cblxuICByZXR1cm4gcHJvZ3JhbUZpbGVzO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlQ29udGVudHMoXG4gIGZpbGU6IHN0cmluZyxcbiAgb3B0aW9uczogVHNsaW50QnVpbGRlck9wdGlvbnMsXG4gIHByb2dyYW0/OiB0cy5Qcm9ncmFtLFxuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgLy8gVGhlIGxpbnRlciByZXRyaWV2ZXMgdGhlIFNvdXJjZUZpbGUgVFMgbm9kZSBkaXJlY3RseSBpZiBhIHByb2dyYW0gaXMgdXNlZFxuICBpZiAocHJvZ3JhbSkge1xuICAgIGlmIChwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZSkgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYEZpbGUgJyR7ZmlsZX0nIGlzIG5vdCBwYXJ0IG9mIHRoZSBUeXBlU2NyaXB0IHByb2plY3QgJyR7b3B0aW9ucy50c0NvbmZpZ30nLmA7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogdGhpcyByZXR1cm4gaGFkIHRvIGJlIGNvbW1lbnRlZCBvdXQgb3RoZXJ3aXNlIG5vIGZpbGUgd291bGQgYmUgbGludGVkLCBmaWd1cmUgb3V0IHdoeS5cbiAgICAvLyByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gTk9URTogVGhlIHRzbGludCBDTEkgY2hlY2tzIGZvciBhbmQgZXhjbHVkZXMgTVBFRyB0cmFuc3BvcnQgc3RyZWFtczsgdGhpcyBkb2VzIG5vdC5cbiAgdHJ5IHtcbiAgICByZXR1cm4gc3RyaXBCb20ocmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlYWQgZmlsZSAnJHtmaWxlfScuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHNsaW50QnVpbGRlcjtcbiJdfQ==