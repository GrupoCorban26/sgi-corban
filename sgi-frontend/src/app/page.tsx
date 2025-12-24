import Form from 'next/form'
 
export default function Page() {
  return (
    <Form action="/search" className='bg-white'>
      {/* On submission, the input value will be appended to
          the URL, e.g. /search?query=abc */}
      <input name="query" />
      <button type="submit">Submit</button>
    </Form>
  )
}