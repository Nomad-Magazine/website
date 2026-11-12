import assert from 'node:assert/strict'
import {serializeJsonLd} from '../src/utils/schema.ts'
const payload={'@context':'https://schema.org','@type':'WebPage',name:'Owner text </script><script>alert(1)</script>',description:'Quotes " and <img src=x onerror=alert(1)> remain plain text.'}
const encoded=serializeJsonLd(payload)
assert(!encoded.includes('</script>'))
assert(!encoded.includes('<img'))
assert.deepEqual(JSON.parse(encoded),payload)
console.log('PASS: untrusted owner text cannot break out of JSON-LD script elements; content round-trips unchanged.')
