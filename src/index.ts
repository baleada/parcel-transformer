import { Transformer } from '@parcel/plugin'
import type { Transformer as TransformerType, Async, MutableAsset, TransformerResult } from '@parcel/types'
import { createFilter } from '@rollup/pluginutils'
import type { FilterPattern } from '@rollup/pluginutils'
import { resolve } from 'path'

export type Options = {
  transform?: ((api: Api) => Async<(MutableAsset | TransformerResult)[]>),
  include?: FilterPattern,
  exclude?: FilterPattern,
  test?: Test
}

type Test = (api: TestApi) => boolean

type TestApi = {
  id?: string,
  source?: string,
}

export type Api = {
  source: string,
  id: string,
  context: Parameters<TransformerType<Config>['transform']>[0],
  utils: { createFilter: typeof createFilter }
}

type Config = {
  transform: Options['transform'],
  test: Test
}

export default new Transformer<Config>({
  async loadConfig ({ config }) {
    const {
      contents: {
        parcelTransformer: { transform, include, exclude, test }
      }
    } = await config.getConfig<{ parcelTransformer: Options }>([resolve('baleada.config.js')], {})
    config.invalidateOnStartup()

    const ensuredTest = ensureTest({ include, exclude, test })

    return { transform, test: ensuredTest }
  },
  async transform (context) {
    const { transform, test } = context.config,
          source = await context.asset.getCode(),
          id = context.asset.filePath
          
    if (!test({ source, id })) {
      return [context.asset]
    }

    return await transform({
      source,
      id,
      context,
      utils: { createFilter }
    })
  }
})

function ensureTest ({ include, exclude, test }: { include?: FilterPattern, exclude?: FilterPattern, test?: Test }): Test {
  if (typeof test === 'function') return test

  const filter = createFilter(include, exclude)
  return ({ id }) => filter(id)
}
