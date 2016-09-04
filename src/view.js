'use strict';

import _ from 'underscore';
import Joi from 'joi';
import Boom from 'boom';


class ModelView {

  constructor(server, model, module) {
    this.server = server;
    this.routingOptions = server.routingOptions ? server.routingOptions() : { };
    this.model = model;

    this.tags = module ? ['api', module] : ['api'];
  }

  _handleSequelizeErrors(error) {

    var errorObject = {};

    switch (error.name) {
      case 'SequelizeForeignKeyConstraintError':
        var indexArray = error.index.split('_');
        var fieldNameIndex = indexArray.length - 2;
        var fieldName = indexArray[fieldNameIndex].substring(0, indexArray[fieldNameIndex].length - 2);

        errorObject[fieldName] = 'Wybrany obiekt nie istnieje';
        break;
      case 'SequelizeUniqueConstraintError':
        if ( error.errors ) {
          for (let singleError of error.errors) {
            errorObject[singleError.path] = singleError.message;
          }
        }
        break;
      case 'SequelizeConnectionRefusedError':
        errorObject.message = `Connection refused to ${error.parent.address}:${error.parent.port}`;
        errorObject.ip = error.parent.address;
        errorObject.port = error.parent.port;
        break;
      case 'SequelizeValidationError':
        if ( error.errors ) {
          for ( let singleError of error.errors ) {
            var path = singleError.path.endsWith('Id') ? singleError.path.substring(0, singleError.path.length - 2) : singleError.path;
            errorObject[path] = singleError.message;
          }
        }
        break;
      default:
        if ( error.errors ) {
          return error.errors;
        } else {
          errorObject.message = error.message || 'error while performing database operation';
        }
    }

    return errorObject;

  }

  _generateSwaggerResponses(actionType) {
    var swaggerObject = null;
    var commonResponses = {
      '200': { description: 'Success', schema: this.model.getSchema ? this.model.getSchema() : { } },
      '201': { description: 'Created', schema: this.model.getSchema ? this.model.getSchema() : { } },
      '400': { description: 'Bad request' },
      '401': { description: 'Unauthorized' },
      '404': { description: 'Not found' },
      '422': { description: 'Wrong data' }
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
            '200': { description: 'Success', schema: Joi.array().items(this.model.getSchema ? this.model.getSchema() : { }) },
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
            '201': { description: 'Success', schema: Joi.array().items(this.model.getSchema ? this.model.getSchema() : { }) },
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
            '200': { description: 'Deleted' },
            '400': commonResponses['400'],
            '401': commonResponses['401'],
            '404': commonResponses['404']
          }
        };
        break;
    }

    return swaggerObject;
  }

  _extendRoutingOptions(routeObjectConfig, additionalOptions) {
    _.each(additionalOptions, (val, key) => {
      if ( val && val.constructor === Object && _.isObject(val) && !_.isEmpty(val) ) {
        routeObjectConfig[key] = routeObjectConfig[key] || {};
        this._extendRoutingOptions(routeObjectConfig[key], val);
      } else {
        routeObjectConfig[key] = val;
      }
    });
    return routeObjectConfig;
  }

  _getPrimaryKeyWithSchema(routeObject) {
    var primaryKeyField = this.model.primaryKeyField;
    var schemaObject = this.model.getSchema ? this.model.getSchema() : null;

    var schema = null;
    if ( schemaObject ) {
      schema = _.find(schemaObject._inner.children, (val, key) => {
        return val.key == primaryKeyField;
      });
    }

    if ( schema ) {
      routeObject.config.validate.params[primaryKeyField] = schema.schema.required();
    } else {
      routeObject.config.validate.params.id = Joi.number().integer().positive().required();
    }
  }

  get(scopes) {
    scopes = scopes ? scopes : ['defaultScope'];
    var routeObject = {
      method: 'GET',
      path: `/${this.model.getTableName()}/{${this.model.primaryKeyField}}`,

      config: {
        description: `Return ${this.model.name}`,
        id: `return${this.model.name}`,
        tags: this.tags,

        validate: { params: {  } },

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('get') },

        handler: (request, reply) => {
          this.model.scope(scopes).findById(request.params.id).then((instance) => {
            if ( instance ) {
              reply(instance.toJson());
            } else {
              reply(Boom.notFound(`${this.model.name} does not exist`));
            }
          });
        }
      }
    };

    this._getPrimaryKeyWithSchema(routeObject);
    this._extendRoutingOptions(routeObject.config, this.routingOptions);
    return routeObject;
  }

  list(scopes, serializer) {
    scopes = scopes ? scopes : ['defaultScope'];
    var routeObject = {
      method: 'GET',
      path: `/${this.model.getTableName()}`,

      config: {
        description: `Return all ${this.model.options.name.plural}`,
        id: `returnAll${this.model.options.name.plural}`,
        tags: this.tags,

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('list') },

        handler: (request, reply) => {
          this.model.scope(scopes).findAll().then((instances) => {
            var mappedInstances = instances.map((instance) => {
              if ( serializer ) {
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

  create() {
    var routeObject = {
      method: 'POST',
      path: `/${this.model.getTableName()}`,

      config: {
        description: `Create ${this.model.name}`,
        tags: this.tags,
        id: `create${this.model.name}`,

        validate: { payload: this.model.getCreateSchema ? this.model.getCreateSchema() : { } },

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('create') },

        handler: (request, reply) => {
          this.model.create(request.payload).then((instance) => {
            reply(instance.toJson()).code(201);
          }).catch((err) => {
            reply(this._handleSequelizeErrors(err)).code(422);
          });
        }
      }
    };

    this._extendRoutingOptions(routeObject.config, this.routingOptions);
    return routeObject;
  }

  bulkCreate() {
    var routeObject = {
      method: 'POST',
      path: `/${this.model.getTableName()}/bulk_create`,

      config: {
        description: `Bulk create ${this.model.name}`,
        tags: this.tags,
        id: `bulkCreate${this.model.name}`,

        validate: { payload: Joi.array().items(this.model.getCreateSchema ? this.model.getCreateSchema() : { }).label(`${this.model.options.name.plural}`) },

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('bulkCreate') },

        handler: (request, reply) => {
          this.model.bulkCreate(request.payload, { validate: true, returning: true }).then((instances) => {
            var mappedInstances = instances.map((instance) => {
              return instance.toJson();
            });

            reply(mappedInstances).code(201);
          }).catch((err) => {
            reply(this._handleSequelizeErrors(err)).code(422);
          });
        }
      }
    };

    this._extendRoutingOptions(routeObject.config, this.routingOptions);
    return routeObject;
  }

  update() {
    var routeObject = {
      method: 'PUT',
      path: `/${this.model.getTableName()}/{${this.model.primaryKeyField}}`,

      config: {
        description: `Update ${this.model.name}`,
        tags: this.tags,
        id: `update${this.model.name}`,

        validate: {
          params: { },
          payload: this.model.getSchema ? this.model.getSchema() : { }
        },

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('update') },

        handler: (request, reply) => {
          this.model.findById(request.params.id).then((instance) => {
            if ( instance ) {
              instance.update(request.payload).then((i) => {
                reply(i.toJson());
              }).catch((err) => {
                reply(this._handleSequelizeErrors(err)).code(422);
              });
            } else {
              reply(Boom.notFound(`${this.model.name} does not exist`));
            }
          });
        }
      }
    };

    this._getPrimaryKeyWithSchema(routeObject);
    this._extendRoutingOptions(routeObject.config, this.routingOptions);
    return routeObject;
  }

  delete() {
    var routeObject = {
      method: 'DELETE',
      path: `/${this.model.getTableName()}/{${this.model.primaryKeyField}}`,

      config: {
        description: `Delete ${this.model.name}`,
        tags: this.tags,
        id: `delete${this.model.name}`,

        validate: { params: {  } },

        plugins: { 'hapi-swagger': this._generateSwaggerResponses('delete') },

        handler: (request, reply) => {
          this.model.findById(request.params.id).then((instance) => {
            if ( instance ) {
              instance.destroy().then(() => {
                reply({ message: `${this.model.name} was deleted` });
              }).catch((err) => {
                reply(Boom.badRequest(err));
              });
            } else {
              reply(Boom.notFound(`${this.model.name} does not exist`));
            }
          });
        }
      }
    };

    this._getPrimaryKeyWithSchema(routeObject);
    this._extendRoutingOptions(routeObject.config, this.routingOptions);
    return routeObject;
  }

}


module.exports = ModelView;
