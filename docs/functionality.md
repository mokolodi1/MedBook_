(incomplete)

Current functionality of Teo's collaborations

## Both.js : Collaborations Schema  

name: String, unique, can't contain @
description: String
collaborators: Array of String
administrators: Array of String
publiclyListed: Bool
requestsToJoin :
	array of {firstName, lastName, email, personalCollaboration}

adminApprovalRequired: Bool

## Both.js functions 

MedBook.findUser()
	adds a bunch of functions to the user object returned:
* personalCollaboration < user's collaborations.personal
     
* email < user's collaborations.email_address
     
* getCollaborations < (different client side vs server side)
     
* 	hasAccess < user has access to object or collaboration
      	
* ensureAccess < hasAccess, or throws an error

* isAdmin < is user administrator of this collaboration
	^ in fact what this is going on: no user document is administrator of a collaboration. the only thing that can be administrator of a collaboration is another collaboration. which may be a personal collaboration.

* ensureAdmin < isAdmin or throws an error

MedBook.ensureUser : findUser but throws an error if not found

## client.js functions
getCollaborations (client-side)
global template helper: currentMedBookUser -- returns the MedBook user (with all their useful functions)

## collaborationFunctionality.js
getAssociatedCollaborators(doc) - returns all collaborators having access to doc (directly or indirectly)

getAssociatedCollaborations (doc) -- returns all collaborations that doc has access to (directly or indirectly); ie, all collaborations for which doc can access items included in that collaboration



