

export default async function Profile (
  {params}:
  {params:Promise<{name:String}>}){

    const {name}  = await params;

  return(
    <div className="flex justify-center items-center">
      <h1>
        This Is Profile of {name}.
      </h1>
    </div>
  )

}