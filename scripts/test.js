var x
async function hello () {
  x = 'hello world'
}
async function no () {
  x = 'no'
}
hello()
console.log(x)
no()
console.log(x)
