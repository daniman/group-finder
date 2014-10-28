var express = require('express');
var router = express.Router();

var User = require('../models/users');
var Project = require('../models/projects');
var utils = require('../utils/utils');
router.get('/', function(req, res) {
  	Project.find({},function(e,projects){
		if(e){
			utils.sendErrResponse(res, 500, 'An unexpected error occured.');
		}
		else{
  			res.json(projects);
		}
  	});
});
//WORKING
router.post('/', function(req, res) {
	Project.find({name:req.body.name},function(err,docs){
		if(err){
			utils.sendErrResponse(res, 500, 'An unexpected error occured.');
		}
		if(docs.length === 0){
			var newProject = new Project({
			  name: req.body.name,
			  end_date: req.body.end_date 
			})
			newProject.save(function(err){
				if(err){
					utils.sendErrResponse(res, 500, 'An unexpected error occured.');
				}
				else{
					utils.sendSuccessResponse(res, 'Sucessfully added project');
				}
			})
		}else{
			utils.sendSuccessResponse(res, 'That project already exists');
		}
	});
	
}); 
//WORKING
router.get('/:project_name/users', function(req, res) {
	// returning entire user object
  	Project.findOne({"name" : req.params.project_name}).populate('users').exec({},function(err, docs){
		if(err|| docs==null){
			 utils.sendErrResponse(res, 404, 'The project could not be found.');
		}
		else{
  			res.json(docs.users);
		}
  	});
});

router.get('/:project_name', function(req, res) {
  	Project.findOne({"name" : req.params.project_name},function(err, docs){
		if(err|| docs==null){
			 utils.sendErrResponse(res, 404, 'The project could not be found.');
		}
		else{
  			res.json(docs);
		}
  	});
});

router.get('/:username/projects', function(req, res) {
	User.findOne({'authentication.username': req.params.username}).populate("projects.proj_id").exec({}, function (err, user) {
		if(err){
		utils.sendErrResponse(res, 500, 'An unexpected error occured.');
		}
		else{
			res.json(user.projects);
		}
	});
});

//WORKING
router.get('/:project_name/users/filter', function(req, res) {
	var userID=req.session.passport.user; 
	var name=req.param('project_name');
	var location=req.query.location?req.query.location :1;
	var availability=req.query.availability?req.query.availability :1;	
	var grade=req.query.grade?req.query.grade :1;
	var interaction=req.query.interaction?req.query.interaction :1;	
	var dedication=req.query.dedication?req.query.dedication :1;
	var timing=req.query.timing?req.query.timing :1;	
	var skills=req.query.skills?req.query.skills :1;
	var skillset=req.query.skillset?req.query.skillset :[];		
	Project.findOne({name:name},function(err,project){
		if(err||project==null){   
            utils.sendErrResponse(res, 404, 'The project could not be found.');
		}
		else{
			var projectID=project.id;
			var userIDs=project.users;
			if(!req.user){   
					utils.sendErrResponse(res, 401, 'You must first login as a user');
				}
			else{
					var currentUser=req.user;
					User.find({_id:{$in: userIDs}},function(errs,docs){
						if(errs){
							utils.sendErrResponse(res, 500, 'An unknown error occurred.');
						}
						else{
							var users=[];	
							docs.forEach(function(user){
								var score=0;
								// Add 1 if the location is the same. Otherwise add 0
								if(currentUser.info.location){
									if(currentUser.info.location==user.info.location){
										score+= parseInt(location)
									}
								}
								console.log("1: " + score + "!!!!" + typeof score + user.authentication.username);
								// number of same hours availible over total number of hours current user is available
								// times the user-inputted weight
								if(currentUser.info.availibility){
								var result = currentUser.info.availibility.filter(function(c) {
									return user.info.availibility.indexOf(c) !== -1;
								});
									score+=(result.length*availability)/currentUser.info.availibility.length
								}
								console.log("2: " + score + "!!!!" + typeof score)
							
								
								// number of matched requested skills divided by the total number of requested skills
								// times the user-inputted weight
								if(skillset){
								var result = skillset.filter(function(c) {
									return user.info.skills.indexOf(c) !== -1;
								});
									if(skillset.length > 0){
										score+=(result.length*skills)/skillset.length
									}
								}
								console.log("3: " + score + "!!!!" + typeof score)
								var currentUserProject=currentUser.projects.filter(function(e){ return e.proj_id == projectID; });
								var userProject=user.projects.filter(function(e){ return e.proj_id == projectID; });
								// for grade, interaction, dedication, and timing the score is 1 minus the difference 
								// times the user-inputed weight
								if(currentUserProject.desired_grade){
									score+=(1-Math.abs(currentUserProject.desired_grade-userProject.desired_grade))*grade;
								}
								console.log("4: " + score + "!!!!" + typeof score)
								if(currentUserProject.interaction){
									score+=(1-Math.abs(currentUserProject.interaction-userProject.interaction))*interaction;
								}
								console.log("5: " + score + "!!!!" + typeof score)
								if(currentUserProject.dedication){
									score+= (1-Math.abs(currentUserProject.dedication-userProject.dedication))*dedication;
								}
								console.log("6: " + score + "!!!!" + typeof score)
								if(currentUser.info.timing != -1){
									console.log(currentUser.info.timing)
									console.log(user.info.timing)
									score+=(1-Math.abs(currentUser.info.timing-user.info.timing))*timing;
								}
								console.log("7: " + score + "!!!!" + typeof score)
								// add to list of users
								users.push({'user':user, 'score':score});
							});
						
							// return users sorted by descending scores
							res.json(users.sort(function(a, b) {return a.score > b.score;}).reverse());
						}
					});
				}
		}

	});
	
});
//WORKING
router.post('/:project_name/users', function(req, res) {
  	if(req.user){
		Project.update({"name": req.params.project_name},{$addToSet: {"users":  req.user._id}},function(e,docs){
			if(e){
				 utils.sendErrResponse(res, 500, 'An unexpected error occurred. We could not add the user to the project.');
			}
			//TODO: add project name to user's project list
			Project.findOne({"name": req.params.project_name},function(err,docs){
				User.find({"_id": req.user._id,"projects.proj_id": docs._id}, function(e,projects){
					if(projects.length === 0){
						var newProject = {
						  proj_id : docs._id,
						  desired_grade : req.body.desired_grade,
						  dedication : req.body.dedication,
						  interaction :  req.body.interaction
						}
						User.update({"_id": req.user._id},{$push: {"projects": newProject}},function(e,docs){
							utils.sendSuccessResponse(res, 'Sucessfully added user to project');

						});
					}
					else{
						utils.sendSuccessResponse(res, 'That project is already in your projects');

					}
				});
				
				

			});
		});
  	}
  	else{
		utils.sendErrResponse(res, 401, 'You must first login as a user');
  	}
  	

});

router.delete('/:project_name/users', function(req, res) {
  	if(req.user){
  		Project.findOne({"name": req.params.project_name},function(err,docs){
			if(err){
				 utils.sendErrResponse(res, 500, 'An unexpected error occurred. We could not add the user to the project.');
			}
			else{
  				docs.users.remove(req.user._id);
  				docs.save(function(){utils.sendSuccessResponse(res, 'Sucessfully removed user from project');});
			}
  		});
  	}
  	else{
		utils.sendErrResponse(res, 401, 'You must first login as a user');
  	}
});


router.delete('/:project_name', function(req, res) {
  	if(req.user){
  		Project.remove({name:req.params.project_name},function(e,docs){
			if(e){
				 utils.sendErrResponse(res, 500, 'An unexpected error occurred. We could not add the user to the project.');
			}
			else{
				utils.sendSuccessResponse(res, 'Sucessfully removed user from project');
			}
  		});
  	}
  	else{
		utils.sendErrResponse(res, 401, 'You must first login as a user');
  	}
});
module.exports = router;