/* 
    valaaFiles is ValaaScript converter that converts json string to folders and files.
    Entity: folder
    property: goes to "properties" file
    identifiers: goes to "identifiers" file
    media: file
    relation:
*/

//dependencies
var fs = require('fs');

//TODO: settings file with good ways to setup src file and dst folder. Maybe JSON

// json conversion
var data = fs.readFileSync('./src/rimpsu.json');
var dataJSON = JSON.parse(data);

// checker for data that everything is included
var addedElements = 0;


//helper functions 
var getElementByName = (arr, name) => {
    return arr.find((obj)=> {
        var id = obj.id ? obj.id : obj.name;
        return id === name
    });
}

var createFolder = (path, obj) => {
    var id = obj.hasOwnProperty('id') ? obj.id.replace("/","@") : obj.name;
    var folder = path+id;
    if(!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
    } else {
        if(fs.existsSync(folder+"/"+"properties")) fs.unlinkSync(folder+"/"+"properties","");
        if(fs.existsSync(folder+"/"+"instances")) fs.unlinkSync(folder+"/"+"instances","");
    }
    return folder +"/";
};

var createProperties = (path,obj) => {
    for(var property in obj) {
        if(property !== 'owner') {
            fs.writeFileSync(path + property,obj[property]);
        }
    }
}


var medias = dataJSON.content;

for(var media in medias) {
    // this is an old way to this.. The new one did not work
    medias[media] = new Buffer(medias[media], 'base64').toString('utf8');
}


// change names that are reserved for identifiers, properties and .meta files
var n_properties = 0;
var n_meta = 0;
var n_identifiers = 0;

dataJSON.structure.forEach(item => {
    if(item.name === "properties") {
        item.name += ++n_properties;
    } 
    else if(item.name === "identifiers") { 
        item.name += ++n_identifiers;
    } 
    else if(item.name.endsWith(".meta")) {
        item.name += ++n_meta;
    }


});


// getting first elements
var currentObjects = dataJSON.structure.filter( item => item.type === 'Entity' && !item.owner);
//var medias = dataJSON.content;
var rootElements = [];
var nextRootElements = []; 


//console.log(dataJSON);

var depthOfTree = 0

// loop until every element is stored
while(addedElements < dataJSON.structure.length) {


//    console.log("Layer " + depthOfTree + ":");
//    console.log(addedElements + "/" + dataJSON.structure.length);
//    console.log(currentObjects);

//    console.log("rootElements: ")
//    console.log(rootElements);



    currentObjects.forEach(element => {

        console.log(element);

        // find a proper folder for data
        var parentFolder;
        if(depthOfTree === 0) {
            parentFolder = "dst/";
        } else {
            var owner = getElementByName(rootElements,element.owner);
            parentFolder = owner.folder;
        }

        

        // if id then id needs to be trimmed because of "/" sign between name and raw id
        var id = element.hasOwnProperty('id') ? element.id.replace("/","@") : element.name;

        // store the data. Storing depends on the type of the data

        if(element.type === 'Entity') {
            var folder = createFolder(parentFolder,element);
            createProperties(folder,element);
            element.folder = folder;
            nextRootElements.push(element);
        } 
        else if(element.type === 'Property') {
    
            if(element.propertyType === 'Identifier') {

                if(fs.existsSync(parentFolder+"identifiers")) {
                    fs.appendFileSync(parentFolder+"identifiers", "\n" + id + ": " + element.target);
                } 
                else {
                    fs.writeFileSync(parentFolder+"identifiers", id + ": " + element.target);
                }
            } 
            else {
    
                var data = typeof element.value === 'object' ? JSON.stringify(element.value) : element.value;
    
                if(fs.existsSync(parentFolder+"properties")) {
                    fs.appendFileSync(parentFolder+"properties", "\n" + id + ": " + data);
                } else {
                    fs.writeFileSync(parentFolder+"properties", id + ": " + data);
                }
            }
        
        } 
        else if(element.type === 'Relation') {
            console.log("Warning! Relation will be ignored!");
        } 
        else if(element.type === 'Media'){
            fs.writeFileSync(parentFolder+element.name, medias[element.name]);

           // console.log(element.name + ": " + medias[element.name]);

        }

        addedElements++;
        element.added = true;
    })

    rootElements = nextRootElements;


    // find all elements that owner is one of the objects from previous layer  
    currentObjects = dataJSON.structure.filter( item => 
        rootElements.find(element => {
            var id;
            if(element.hasOwnProperty('id')) id=element.id; else id=element.name; 
            if(item.owner === id && !item.added) return true;  
            return false; 
        })
    );
    depthOfTree++;
}


console.log("Done!")
console.log("elements:" + addedElements + "/" + dataJSON.structure.length);







