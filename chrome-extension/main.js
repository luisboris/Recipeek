const recipe_div = document.getElementById('recipe')
const recipe_buttons = document.getElementById('recipe-buttons')
const options_div = document.getElementById('options')
let pageURL

main()

////// MAIN FUNCTIONS
function main() {
    
}

displayRecipes()

function displayRecipes(){
    chrome.storage.local.get('recipes', (data)=>{
        let recipes = data.recipes

        // check if INGREDIENTS Node overlaps METHOD Node or v.v. and they're differente than RECIPE Node
        for (let recipe of recipes) {
            let lists = true
            if (recipe.ing.element == recipe.Node.element
             || recipe.meth.element == recipe.Node.element 
             || recipe.ing.element == recipe.meth.element) {
                lists = false
            }
            createRadio(lists)
        }
    });
}

function createRecipeRadios(lists=true) {
    /*
    Create a Radio with 3 Buttons, one for RECIPE and one for each LIST of IGREDIENTS and METHOD
    */
    recipes_radios.innerHTML = ''

    createRadio(0, 'recipes', `Recipe`, recipes_radios)
    if (lists == true) {
        createRadio(0, 'recipes.ing', 'Ingredients', recipes_radios)
        createRadio(0, 'recipes.meth', 'Instructions', recipes_radios)
    }
}

function createRadio(index, value, text, parent) {
    let checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'radio')
    checkbox.setAttribute('name', 'toggle')
    checkbox.setAttribute('value', `${value}${index}`)
    checkbox.classList.add('btn-check', 'radio')
    checkbox.setAttribute('id', `btn${value}${index}`)
    checkbox.setAttribute('autocomplete', 'off')

    let label = document.createElement('label')
    label.classList.add('btn', 'btn-outline-primary')
    label.setAttribute('for', `btn${value}${index}`)
    label.innerText = text
    
    parent.appendChild(checkbox)
    parent.appendChild(label)

    checkbox.addEventListener('change', (r)=> { handleRadios(r) });
}