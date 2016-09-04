'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function() {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];
			descriptor.enumerable = descriptor.enumerable || false;
			descriptor.configurable = true;
			if ("value" in descriptor) descriptor.writable = true;
			Object.defineProperty(target, descriptor.key, descriptor);
		}
	}
	return function(Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);
		if (staticProps) defineProperties(Constructor, staticProps);
		return Constructor;
	};
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : {
		default: obj
	};
}

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

var ModelView = function() {
	function ModelView(server, model, module) {
		_classCallCheck(this, ModelView);

		this.server = server;
		this.routingOptions = server.routingOptions ? server.routingOptions() : { };
		this.model = model;

		this.tags = module ? ['api', module] : ['api'];
	}

	_createClass(ModelView, [{
		key: '_handleSequelizeErrors',
		value: function _handleSequelizeErrors(error) {

			var errorObject = {};

			switch (error.name) {
				case 'SequelizeForeignKeyConstraintError':
					var indexArray = error.index.split('_');
					var fieldNameIndex = indexArray.length - 2;
					var fieldName = indexArray[fieldNameIndex].substring(0, indexArray[fieldNameIndex].length - 2);

					errorObject[fieldName] = 'Wybrany obiekt nie istnieje';
					break;
				case 'SequelizeUniqueConstraintError':
					if (error.errors) {
						var _iteratorNormalCompletion = true;
						var _didIteratorError = false;
						var _iteratorError = undefined;

						try {
							for (var _iterator = error.errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
								var singleError = _step.value;

								errorObject[singleError.path] = singleError.message;
							}
						} catch (err) {
							_didIteratorError = true;
							_iteratorError = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion && _iterator.return) {
									_iterator.return();
								}
							} finally {
								if (_didIteratorError) {
									throw _iteratorError;
								}
							}
						}
					}
					break;
				case 'SequelizeConnectionRefusedError':
					errorObject.message = 'Connection refused to ' + error.parent.address + ':' + error.parent.port;
					errorObject.ip = error.parent.address;
					errorObject.port = error.parent.port;
					break;
				case 'SequelizeValidationError':
					if (error.errors) {
						var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = error.errors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var _singleError = _step2.value;

								var path = _singleError.path.endsWith('Id') ? _singleError.path.substring(0, _singleError.path.length - 2) : _singleError.path;
								errorObject[path] = _singleError.message;
							}
						} catch (err) {
							_didIteratorError2 = true;
							_iteratorError2 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion2 && _iterator2.return) {
									_iterator2.return();
								}
							} finally {
								if (_didIteratorError2) {
									throw _iteratorError2;
								}
							}
						}
					}
					break;
				default:
					if (error.errors) {
						return error.errors;
					} else {
						errorObject.message = error.message || 'error while performing database operation';
					}
			}

			return errorObject;
		}
	}, {
		key: '_generateSwaggerResponses',
		value: function _generateSwaggerResponses(actionType) {
			var swaggerObject = null;
			var commonResponses = {
				'200': {
					description: 'Success',
					schema: this.model.getSchema()
				},
				'201': {
					description: 'Created',
					schema: this.model.getSchema()
				},
				'400': {
					description: 'Bad request'
				},
				'401': {
					description: 'Unauthorized'
				},
				'404': {
					description: 'Not found'
				},
				'422': {
					description: 'Wrong data'
				}
			};

			switch (actionType) {

				case 'get':
					swaggerObject = {
						responses: {
							'200': commonResponses['200'],
							'400': commonResponses['400'],
							'401': commonResponses['401'],
							'404': commonResponses['404']
						}
					};
					break;
				case 'list':
					swaggerObject = {
						responses: {
							'200': {
								description: 'Success',
								schema: _joi2.default.array().items(this.model.getSchema())
							},
							'400': commonResponses['400'],
							'401': commonResponses['401']
						}
					};
					break;
				case 'create':
					swaggerObject = {
						responses: {
							'201': commonResponses['201'],
							'400': commonResponses['400'],
							'401': commonResponses['401'],
							'422': commonResponses['422']
						}
					};
					break;
				case 'bulkCreate':
					swaggerObject = {
						responses: {
							'201': {
								description: 'Success',
								schema: _joi2.default.array().items(this.model.getSchema())
							},
							'400': commonResponses['400'],
							'401': commonResponses['401'],
							'422': commonResponses['422']
						}
					};
					break;
				case 'update':
					swaggerObject = {
						responses: {
							'200': commonResponses['200'],
							'400': commonResponses['400'],
							'401': commonResponses['401'],
							'404': commonResponses['404'],
							'422': commonResponses['422']
						}
					};
					break;
				case 'delete':
					swaggerObject = {
						responses: {
							'200': {
								description: 'Deleted'
							},
							'400': commonResponses['400'],
							'401': commonResponses['401'],
							'404': commonResponses['404']
						}
					};
					break;
			}

			return swaggerObject;
		}
	}, {
		key: '_extendRoutingOptions',
		value: function _extendRoutingOptions(routeObjectConfig, additionalOptions) {
			var _this = this;

			_underscore2.default.each(additionalOptions, function(val, key) {
				if (val && val.constructor === Object && _underscore2.default.isObject(val) && !_underscore2.default.isEmpty(val)) {
					routeObjectConfig[key] = routeObjectConfig[key] || {};
					_this._extendRoutingOptions(routeObjectConfig[key], val);
				} else {
					routeObjectConfig[key] = val;
				}
			});
			return routeObjectConfig;
		}
	}, {
		key: '_getPrimaryKeyWithSchema',
		value: function _getPrimaryKeyWithSchema(routeObject) {
			var primaryKeyField = this.model.primaryKeyField;
			var schema = _underscore2.default.find(this.model.getSchema()._inner.children, function(val, key) {
				return val.key == primaryKeyField;
			});

			if (schema) {
				routeObject.config.validate.params[primaryKeyField] = schema.schema.required();
			} else {
				routeObject.config.validate.params.id = _joi2.default.number().integer().positive().required();
			}
		}
	}, {
		key: 'get',
		value: function get(scopes) {
			var _this2 = this;

			scopes = scopes ? scopes : ['defaultScope'];
			var routeObject = {
				method: 'GET',
				path: '/' + this.model.getTableName() + '/{' + this.model.primaryKeyField + '}',

				config: {
					description: 'Return ' + this.model.name,
					id: 'return' + this.model.name,
					tags: this.tags,

					validate: {
						params: {}
					},

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('get')
					},

					handler: function handler(request, reply) {
						_this2.model.scope(scopes).findById(request.params.id).then(function(instance) {
							if (instance) {
								reply(instance.toJson());
							} else {
								reply(_boom2.default.notFound(_this2.model.name + ' does not exist'));
							}
						});
					}
				}
			};

			this._getPrimaryKeyWithSchema(routeObject);
			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}, {
		key: 'list',
		value: function list(scopes, serializer) {
			var _this3 = this;

			scopes = scopes ? scopes : ['defaultScope'];
			var routeObject = {
				method: 'GET',
				path: '/' + this.model.getTableName(),

				config: {
					description: 'Return all ' + this.model.options.name.plural,
					id: 'returnAll' + this.model.options.name.plural,
					tags: this.tags,

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('list')
					},

					handler: function handler(request, reply) {
						_this3.model.scope(scopes).findAll().then(function(instances) {
							var mappedInstances = instances.map(function(instance) {
								if (serializer) {
									return instance[serializer]();
								} else {
									return instance.toJson();
								}
							});

							reply(mappedInstances).code(200);
						});
					}
				}
			};

			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}, {
		key: 'create',
		value: function create() {
			var _this4 = this;

			var routeObject = {
				method: 'POST',
				path: '/' + this.model.getTableName(),

				config: {
					description: 'Create ' + this.model.name,
					tags: this.tags,
					id: 'create' + this.model.name,

					validate: {
						payload: this.model.getCreateSchema()
					},

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('create')
					},

					handler: function handler(request, reply) {
						_this4.model.create(request.payload).then(function(instance) {
							reply(instance.toJson()).code(201);
						}).catch(function(err) {
							reply(_this4._handleSequelizeErrors(err)).code(422);
						});
					}
				}
			};

			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}, {
		key: 'bulkCreate',
		value: function bulkCreate() {
			var _this5 = this;

			var routeObject = {
				method: 'POST',
				path: '/' + this.model.getTableName() + '/bulk_create',

				config: {
					description: 'Bulk create ' + this.model.name,
					tags: this.tags,
					id: 'bulkCreate' + this.model.name,

					validate: {
						payload: _joi2.default.array().items(this.model.getCreateSchema()).label('' + this.model.options.name.plural)
					},

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('bulkCreate')
					},

					handler: function handler(request, reply) {
						_this5.model.bulkCreate(request.payload, {
							validate: true,
							returning: true
						}).then(function(instances) {
							var mappedInstances = instances.map(function(instance) {
								return instance.toJson();
							});

							reply(mappedInstances).code(201);
						}).catch(function(err) {
							reply(_this5._handleSequelizeErrors(err)).code(422);
						});
					}
				}
			};

			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}, {
		key: 'update',
		value: function update() {
			var _this6 = this;

			var routeObject = {
				method: 'PUT',
				path: '/' + this.model.getTableName() + '/{' + this.model.primaryKeyField + '}',

				config: {
					description: 'Update ' + this.model.name,
					tags: this.tags,
					id: 'update' + this.model.name,

					validate: {
						params: {},
						payload: this.model.getSchema()
					},

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('update')
					},

					handler: function handler(request, reply) {
						_this6.model.findById(request.params.id).then(function(instance) {
							if (instance) {
								instance.update(request.payload).then(function(i) {
									reply(i.toJson());
								}).catch(function(err) {
									reply(_this6._handleSequelizeErrors(err)).code(422);
								});
							} else {
								reply(_boom2.default.notFound(_this6.model.name + ' does not exist'));
							}
						});
					}
				}
			};

			this._getPrimaryKeyWithSchema(routeObject);
			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}, {
		key: 'delete',
		value: function _delete() {
			var _this7 = this;

			var routeObject = {
				method: 'DELETE',
				path: '/' + this.model.getTableName() + '/{' + this.model.primaryKeyField + '}',

				config: {
					description: 'Delete ' + this.model.name,
					tags: this.tags,
					id: 'delete' + this.model.name,

					validate: {
						params: {}
					},

					plugins: {
						'hapi-swagger': this._generateSwaggerResponses('delete')
					},

					handler: function handler(request, reply) {
						_this7.model.findById(request.params.id).then(function(instance) {
							if (instance) {
								console.log(request.auth);
								instance.destroy().then(function() {
									reply({
										message: _this7.model.name + ' was deleted'
									});
								}).catch(function(err) {
									reply(_boom2.default.badRequest(err));
								});
							} else {
								reply(_boom2.default.notFound(_this7.model.name + ' does not exist'));
							}
						});
					}
				}
			};

			this._getPrimaryKeyWithSchema(routeObject);
			this._extendRoutingOptions(routeObject.config, this.routingOptions);
			return routeObject;
		}
	}]);

	return ModelView;
}();

module.exports = ModelView;